// Web Worker für Transkription um UI-Blockierung zu vermeiden
import { pipeline } from '@huggingface/transformers';

let transcriptionPipeline: any = null;

const initializeModel = async () => {
  if (transcriptionPipeline) return transcriptionPipeline;
  
  try {
    console.log('Worker: Lade Whisper-Modell...');
    transcriptionPipeline = await pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-small',
      {
        device: 'wasm',
        dtype: 'fp32',
        revision: 'main'
      }
    );
    console.log('Worker: Whisper-Modell geladen');
    return transcriptionPipeline;
  } catch (error) {
    console.error('Worker: Fehler beim Laden des Modells:', error);
    // Fallback
    transcriptionPipeline = await pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-small',
      { device: 'wasm' }
    );
    return transcriptionPipeline;
  }
};

const transcribeAudio = async (audioData: Float32Array, options: any) => {
  const model = await initializeModel();
  
  // Aufteilen in kleinere Chunks für bessere Performance
  const chunkSize = 16000 * 30; // 30 Sekunden bei 16kHz
  const chunks = [];
  
  for (let i = 0; i < audioData.length; i += chunkSize) {
    const chunk = audioData.slice(i, i + chunkSize);
    chunks.push(chunk);
  }
  
  const results = [];
  
  for (let i = 0; i < chunks.length; i++) {
    // Sende Progress-Update
    self.postMessage({
      type: 'progress',
      progress: (i / chunks.length) * 100,
      message: `Verarbeite Chunk ${i + 1} von ${chunks.length}...`
    });
    
    const result = await model(chunks[i], options);
    results.push(result);
    
    // Kleine Pause um UI responsive zu halten
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  return results;
};

self.onmessage = async (event) => {
  const { type, audioData, options } = event.data;
  
  try {
    switch (type) {
      case 'initialize':
        await initializeModel();
        self.postMessage({ type: 'initialized' });
        break;
        
      case 'transcribe':
        self.postMessage({ 
          type: 'progress', 
          progress: 0, 
          message: 'Starte Transkription...' 
        });
        
        const results = await transcribeAudio(audioData, options);
        
        // Kombiniere Ergebnisse
        let combinedText = '';
        let detectedLanguage = '';
        
        for (const result of results) {
          if (result.chunks && result.chunks.length > 0) {
            combinedText += result.chunks.map((chunk: any) => chunk.text).join(' ').trim() + ' ';
          } else {
            combinedText += (result.text || '') + ' ';
          }
          
          if (result.language && !detectedLanguage) {
            detectedLanguage = result.language;
          }
        }
        
        self.postMessage({
          type: 'complete',
          text: combinedText.trim(),
          language: detectedLanguage
        });
        break;
        
      default:
        throw new Error(`Unbekannter Worker-Befehl: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
};