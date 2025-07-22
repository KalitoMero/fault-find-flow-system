// Optimized Web Worker for memory-efficient transcription
import { pipeline } from '@huggingface/transformers';

interface WorkerState {
  transcriptionPipeline: any | null;
  lastUsed: number;
  memoryUsage: number;
}

const workerState: WorkerState = {
  transcriptionPipeline: null,
  lastUsed: 0,
  memoryUsage: 0
};

const MAX_WORKER_MEMORY_MB = 200;
const MODEL_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes in worker

function getMemoryUsage(): number {
  if ('memory' in performance) {
    return (performance as any).memory.usedJSHeapSize / (1024 * 1024);
  }
  return 0;
}

function cleanupModel(): void {
  if (workerState.transcriptionPipeline) {
    workerState.transcriptionPipeline = null;
    workerState.lastUsed = 0;
    workerState.memoryUsage = 0;
    console.log('Worker: Model cleaned up');
    
    // Force garbage collection if available
    if ('gc' in globalThis) {
      (globalThis as any).gc();
    }
  }
}

function checkMemoryAndCleanup(): void {
  const currentMemory = getMemoryUsage();
  const now = Date.now();
  
  if (currentMemory > MAX_WORKER_MEMORY_MB || 
      (workerState.lastUsed > 0 && now - workerState.lastUsed > MODEL_TIMEOUT_MS)) {
    console.log(`Worker: Memory check - ${currentMemory.toFixed(2)}MB, cleaning up...`);
    cleanupModel();
  }
}

const initializeModel = async () => {
  if (workerState.transcriptionPipeline) {
    workerState.lastUsed = Date.now();
    return workerState.transcriptionPipeline;
  }
  
  checkMemoryAndCleanup();
  
  try {
    console.log('Worker: Loading optimized Whisper model...');
    workerState.transcriptionPipeline = await pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-tiny',
      {
        device: 'wasm',
        dtype: 'fp16'
      }
    );
    
    workerState.lastUsed = Date.now();
    workerState.memoryUsage = getMemoryUsage();
    console.log(`Worker: Model loaded, memory usage: ${workerState.memoryUsage.toFixed(2)}MB`);
    return workerState.transcriptionPipeline;
  } catch (error) {
    console.error('Worker: Failed to load model:', error);
    throw error;
  }
};

const transcribeAudioStream = async (audioData: Float32Array, options: any) => {
  const model = await initializeModel();
  
  // Stream processing with smaller chunks for memory efficiency
  const chunkSize = 16000 * 15; // 15 seconds chunks
  const overlap = 16000 * 1; // 1 second overlap
  const chunks = [];
  
  for (let i = 0; i < audioData.length; i += chunkSize - overlap) {
    const end = Math.min(i + chunkSize, audioData.length);
    const chunk = audioData.slice(i, end);
    chunks.push(chunk);
  }
  
  const results = [];
  
  for (let i = 0; i < chunks.length; i++) {
    // Memory check before each chunk
    checkMemoryAndCleanup();
    
    self.postMessage({
      type: 'progress',
      progress: (i / chunks.length) * 100,
      message: `Processing segment ${i + 1}/${chunks.length}...`
    });
    
    try {
      const result = await model(chunks[i], {
        ...options,
        return_timestamps: false,
        chunk_length_s: 15,
        stride_length_s: 1
      });
      
      results.push(result);
      
      // Clean up chunk data immediately
      chunks[i] = new Float32Array(0);
      
    } catch (error) {
      console.error(`Worker: Error processing chunk ${i + 1}:`, error);
      // Continue with other chunks
    }
  }
  
  // Final cleanup
  audioData = new Float32Array(0);
  
  return results;
};

// Periodic cleanup
setInterval(checkMemoryAndCleanup, 30000);

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
          message: 'Starting optimized transcription...' 
        });
        
        const results = await transcribeAudioStream(audioData, options);
        
        // Combine results efficiently
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
        
        // Final memory cleanup
        results.length = 0;
        
        self.postMessage({
          type: 'complete',
          text: combinedText.trim(),
          language: detectedLanguage
        });
        break;
        
      case 'cleanup':
        cleanupModel();
        self.postMessage({ type: 'cleaned' });
        break;
        
      default:
        throw new Error(`Unknown worker command: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};