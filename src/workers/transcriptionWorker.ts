// Web Worker für Transkription um UI-Blockierung zu vermeiden
import { pipeline } from '@huggingface/transformers';

let transcriptionPipeline: any = null;

const initializeModel = async () => {
  if (transcriptionPipeline) return transcriptionPipeline;
  
  try {
    console.log('Worker: Lade Whisper-Modell...');
    transcriptionPipeline = await pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-tiny',
      {
        device: 'wasm',
        dtype: 'fp16'
      }
    );
    console.log('Worker: Whisper-Modell geladen');
    return transcriptionPipeline;
  } catch (error) {
    console.error('Worker: Fehler beim Laden des Modells:', error);
    // Fallback
    transcriptionPipeline = await pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-tiny',
      { device: 'wasm', dtype: 'fp16' }
    );
    return transcriptionPipeline;
  }
};

const transcribeAudio = async (audioData: Float32Array, options: any) => {
  const model = await initializeModel();
  
  // Optimierte Chunk-Größe für Geschwindigkeit
  const chunkSize = 16000 * 20; // 20 Sekunden für schnellere Verarbeitung
  const chunks = [];
  
  for (let i = 0; i < audioData.length; i += chunkSize) {
    const chunk = audioData.slice(i, i + chunkSize);
    chunks.push(chunk);
  }
  
  const results = [];
  
  // Parallele Verarbeitung bei mehreren Chunks
  if (chunks.length === 1) {
    // Einzelner Chunk - direkter Aufruf
    const result = await model(chunks[0], options);
    results.push(result);
  } else {
    // Mehrere Chunks - sequenziell aber mit Fortschrittsanzeige
    for (let i = 0; i < chunks.length; i++) {
      self.postMessage({
        type: 'progress',
        progress: (i / chunks.length) * 100,
        message: `Verarbeite Segment ${i + 1} von ${chunks.length}...`
      });
      
      const result = await model(chunks[i], options);
      results.push(result);
    }
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