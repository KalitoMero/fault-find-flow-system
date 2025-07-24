import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, RotateCcw, Save, Loader2, Languages } from 'lucide-react';
import { toast } from "sonner";
import { cleanTranscriptionText } from "@/lib/transcriptionCleaner";

interface AudioRecorderSimpleProps {
  onTranscription: (transcription: string, audioBlob: string) => void;
  label: string;
}

// Simplified language configuration
const SUPPORTED_LANGUAGES = [
  { code: 'german', name: 'Deutsch', whisperCode: 'de' },
  { code: 'auto', name: 'Automatisch', whisperCode: null }
];

let transcriptionPipeline: any = null;

const AudioRecorderSimple: React.FC<AudioRecorderSimpleProps> = ({ onTranscription, label }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedLanguage] = useState('german');
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const convertAudioBlobToFloat32Array = async (audioBlob: Blob): Promise<Float32Array> => {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000
    });
    
    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      let monoData: Float32Array;
      if (audioBuffer.numberOfChannels === 1) {
        monoData = audioBuffer.getChannelData(0);
      } else {
        const leftChannel = audioBuffer.getChannelData(0);
        const rightChannel = audioBuffer.getChannelData(1);
        monoData = new Float32Array(leftChannel.length);
        
        for (let i = 0; i < leftChannel.length; i++) {
          monoData[i] = (leftChannel[i] + rightChannel[i]) * 0.5;
        }
      }
      
      if (audioBuffer.sampleRate !== 16000) {
        const ratio = 16000 / audioBuffer.sampleRate;
        const resampledLength = Math.round(monoData.length * ratio);
        const resampledData = new Float32Array(resampledLength);
        
        for (let i = 0; i < resampledLength; i++) {
          const sourceIndex = i / ratio;
          const sourceIndexFloor = Math.floor(sourceIndex);
          const sourceIndexCeil = Math.min(sourceIndexFloor + 1, monoData.length - 1);
          const fraction = sourceIndex - sourceIndexFloor;
          
          resampledData[i] = monoData[sourceIndexFloor] * (1 - fraction) + monoData[sourceIndexCeil] * fraction;
        }
        
        return resampledData;
      }
      
      return monoData;
    } finally {
      audioContext.close();
    }
  };

  const initializeTranscriptionModel = async () => {
    if (transcriptionPipeline) return transcriptionPipeline;
    
    const { pipeline } = await import('@huggingface/transformers');
    
    try {
      transcriptionPipeline = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-tiny',
        { device: 'wasm', dtype: 'fp16' }
      );
      
      return transcriptionPipeline;
    } catch (error) {
      console.error('Fehler beim Laden des Modells:', error);
      toast.error('Fehler beim Laden des Transkriptions-Modells');
      throw error;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 48000, min: 16000 },
          channelCount: { ideal: 2, min: 1 },
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setDetectedLanguage(null);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        setHasRecording(true);
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success("Aufnahme gestartet");
    } catch (error) {
      console.error('Fehler beim Starten der Aufnahme:', error);
      toast.error("Mikrofon-Zugriff verweigert oder nicht verfügbar");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      toast.success("Aufnahme beendet");
    }
  };

  const resetRecording = () => {
    if (isRecording) {
      stopRecording();
    }
    
    setHasRecording(false);
    setIsSaved(false);
    setRecordingTime(0);
    setDetectedLanguage(null);
    audioChunksRef.current = [];
    
    toast.info("Aufnahme zurückgesetzt");
  };

  const saveAndTranscribe = async () => {
    if (!hasRecording || audioChunksRef.current.length === 0) {
      toast.error("Keine Aufnahme zum Speichern vorhanden");
      return;
    }

    setIsTranscribing(true);

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      console.log('Konvertiere Audio...');
      const audioData = await convertAudioBlobToFloat32Array(audioBlob);
      
      const model = await initializeTranscriptionModel();
      
      const selectedLang = SUPPORTED_LANGUAGES.find(lang => lang.code === selectedLanguage);
      const transcriptionOptions: any = {
        chunk_length_s: 20,
        stride_length_s: 3,
        return_timestamps: false,
        temperature: 0.0,
        language: selectedLang?.whisperCode || 'de',
        task: 'transcribe'
      };
      
      toast.info('Transkribiere Audio...');
      const result = await model(audioData, transcriptionOptions);
      
      let transcribedText = result.text || '';
      
      if (!transcribedText.trim()) {
        toast.warning('Keine Sprache erkannt. Bitte sprechen Sie deutlicher.');
        return;
      }
      
      // Apply text improvement
      try {
        transcribedText = await cleanTranscriptionText(transcribedText, false);
      } catch (error) {
        console.warn('Text improvement failed:', error);
      }
      
      // Save as base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        onTranscription(transcribedText, base64Audio);
        setIsSaved(true);
        setDetectedLanguage('DE');
        
        toast.success(`Aufnahme erfolgreich transkribiert!`);
      };
      
      reader.readAsDataURL(audioBlob);
      
    } catch (error) {
      console.error('Fehler bei der Transkription:', error);
      toast.error("Fehler bei der Transkription. Bitte versuchen Sie es erneut.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-2 w-12" style={{ minHeight: '112px', paddingTop: '6px' }}>
      {/* Recording Controls */}
      {!isRecording && !hasRecording && (
        <Button
          type="button"
          onClick={startRecording}
          variant="destructive"
          size="sm"
          className="w-12 p-0"
          style={{ height: '112px' }}
        >
          <Mic className="h-4 w-4" />
        </Button>
      )}

      {isRecording && (
        <div className="flex flex-col gap-2" style={{ height: '112px' }}>
          <Button
            type="button"
            onClick={stopRecording}
            variant="destructive"
            size="sm"
            className="w-12 p-0"
            style={{ height: '56px' }}
          >
            <MicOff className="h-4 w-4" />
          </Button>
          <div className="audio-recording flex items-center justify-center gap-1 px-2 py-1 bg-red-50 border border-red-200 rounded-lg w-12" style={{ height: '52px' }}>
            <div className="flex flex-col gap-1 items-center">
              <div className="flex gap-1">
                <div className="audio-wave bg-red-500 w-1 h-2"></div>
                <div className="audio-wave bg-red-500 w-1 h-3"></div>
                <div className="audio-wave bg-red-500 w-1 h-2"></div>
              </div>
              <span className="text-red-700 font-mono text-[8px]">
                {formatTime(recordingTime)}
              </span>
            </div>
          </div>
        </div>
      )}

      {hasRecording && !isSaved && (
        <div className="flex flex-col gap-2" style={{ height: '112px' }}>
          <Button
            type="button"
            onClick={saveAndTranscribe}
            disabled={isTranscribing}
            variant="outline"
            size="sm"
            className="w-12 p-0"
            style={{ height: '56px' }}
          >
            {isTranscribing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
          </Button>
          <Button
            type="button"
            onClick={resetRecording}
            variant="outline"
            size="sm"
            className="w-12 p-0"
            style={{ height: '52px' }}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {isSaved && (
        <div style={{ height: '112px' }}>
          <Button
            type="button"
            onClick={resetRecording}
            variant="outline"
            size="sm"
            className="w-12 p-0"
            style={{ height: '112px' }}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {/* Status badges - positioned at bottom */}
      <div className="flex flex-col gap-1 mt-auto">
        {detectedLanguage && (
          <Badge variant="outline" className="bg-primary/10 text-[8px] px-1 py-0">
            {detectedLanguage}
          </Badge>
        )}
        {isSaved && (
          <Badge variant="outline" className="bg-green-500/10 text-green-700 text-[8px] px-1 py-0">
            ✓
          </Badge>
        )}
      </div>
    </div>
  );
};

export default AudioRecorderSimple;