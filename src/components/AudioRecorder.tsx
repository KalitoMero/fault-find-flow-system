import React, { useState, useRef } from 'react';
import { pipeline } from '@huggingface/transformers';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Play, Pause, RotateCcw, Save, Loader2 } from 'lucide-react';
import { toast } from "sonner";

interface AudioRecorderProps {
  onTranscription: (transcription: string, audioBlob: string) => void;
  label: string;
}

// Cache für das Whisper-Modell
let transcriptionPipeline: any = null;

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onTranscription, label }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isLoadingModel, setIsLoadingModel] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Konvertiere Audio-Blob zu Float32Array für Whisper
  const convertAudioBlobToFloat32Array = async (audioBlob: Blob): Promise<Float32Array> => {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Konvertiere zu Mono (Whisper erwartet Mono-Audio)
    const monoData = audioBuffer.getChannelData(0);
    
    // Resample auf 16kHz falls nötig (Whisper optimiert für 16kHz)
    if (audioBuffer.sampleRate !== 16000) {
      const resampledLength = Math.round(monoData.length * 16000 / audioBuffer.sampleRate);
      const resampledData = new Float32Array(resampledLength);
      
      for (let i = 0; i < resampledLength; i++) {
        const index = i * audioBuffer.sampleRate / 16000;
        const indexFloor = Math.floor(index);
        const indexCeil = Math.min(indexFloor + 1, monoData.length - 1);
        const weight = index - indexFloor;
        
        resampledData[i] = monoData[indexFloor] * (1 - weight) + monoData[indexCeil] * weight;
      }
      
      return resampledData;
    }
    
    return monoData;
  };

  // Initialisiere das Whisper-Modell (einmalig)
  const initializeTranscriptionModel = async () => {
    if (transcriptionPipeline) return transcriptionPipeline;
    
    setIsLoadingModel(true);
    try {
      console.log('Lade Whisper-Modell für deutsche Transkription...');
      
      // Verwende WASM statt CPU für Browser-Kompatibilität
      transcriptionPipeline = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-small',
        {
          // WASM ist die unterstützte Variante für Browser
          device: 'wasm'
        }
      );
      
      console.log('Whisper-Modell erfolgreich geladen');
      toast.success('Transkriptions-Modell geladen');
      return transcriptionPipeline;
    } catch (error) {
      console.error('Fehler beim Laden des Modells:', error);
      toast.error('Fehler beim Laden des Transkriptions-Modells');
      throw error;
    } finally {
      setIsLoadingModel(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Optimierte Einstellungen für Industrieumgebung
          sampleRate: 16000, // Whisper bevorzugt 16kHz
          channelCount: 1 // Mono für bessere Performance
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioElementRef.current) {
          audioElementRef.current.src = audioUrl;
        }
        
        setHasRecording(true);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Timer für Aufnahmedauer
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

  const playPause = () => {
    if (audioElementRef.current) {
      if (isPlaying) {
        audioElementRef.current.pause();
        setIsPlaying(false);
      } else {
        audioElementRef.current.play();
        setIsPlaying(true);
        
        audioElementRef.current.onended = () => {
          setIsPlaying(false);
        };
      }
    }
  };

  const resetRecording = () => {
    if (isRecording) {
      stopRecording();
    }
    
    setHasRecording(false);
    setIsPlaying(false);
    setIsSaved(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
    
    if (audioElementRef.current) {
      audioElementRef.current.src = '';
    }
    
    toast.info("Aufnahme zurückgesetzt");
  };

  const saveAndTranscribe = async () => {
    if (!hasRecording || audioChunksRef.current.length === 0) {
      toast.error("Keine Aufnahme zum Speichern vorhanden");
      return;
    }

    setIsTranscribing(true);

    try {
      // Initialisiere das Modell falls noch nicht geladen
      const model = await initializeTranscriptionModel();
      
      // Audio-Blob für Transkription vorbereiten
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      console.log('Konvertiere Audio für Transkription...');
      
      // Konvertiere Audio-Blob zu Float32Array
      const audioData = await convertAudioBlobToFloat32Array(audioBlob);
      
      console.log('Starte Transkription...');
      toast.info('Transkribiere Audio...');
      
      // Führe die Transkription durch
      const result = await model(audioData, {
        language: 'german', // Explizit deutsche Sprache
        task: 'transcribe',
        // Chunk-basierte Verarbeitung für bessere Performance
        chunk_length_s: 30,
        stride_length_s: 5
      });
      
      const transcribedText = result.text || '';
      console.log('Transkription erfolgreich:', transcribedText);
      
      if (!transcribedText.trim()) {
        toast.warning('Keine Sprache erkannt. Bitte sprechen Sie deutlicher oder näher zum Mikrofon.');
        return;
      }
      
      // Audio als Base64 String speichern
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        onTranscription(transcribedText, base64Audio);
        setIsSaved(true);
        toast.success("Aufnahme erfolgreich transkribiert!");
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
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-blue-900">{label}</h4>
          <div className="flex space-x-2">
            {isLoadingModel && <Badge variant="secondary">Lädt Modell...</Badge>}
            {isSaved && <Badge className="bg-green-100 text-green-800">Gespeichert</Badge>}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Aufnahme Start/Stop */}
          {!isRecording ? (
            <Button
              variant="outline"
              size="lg"
              onClick={startRecording}
              disabled={isSaved || isLoadingModel}
              className="h-12 px-6"
            >
              <Mic className="h-5 w-5 mr-2" />
              Aufnehmen
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="lg"
              onClick={stopRecording}
              className="h-12 px-6 animate-pulse"
            >
              <MicOff className="h-5 w-5 mr-2" />
              Stop ({formatTime(recordingTime)})
            </Button>
          )}

          {/* Wiedergabe */}
          {hasRecording && !isRecording && (
            <Button
              variant="outline"
              size="lg"
              onClick={playPause}
              disabled={isSaved}
              className="h-12"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
          )}

          {/* Zurücksetzen */}
          {hasRecording && !isSaved && (
            <Button
              variant="outline"
              size="lg"
              onClick={resetRecording}
              className="h-12"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
          )}

          {/* Speichern und Transkribieren */}
          {hasRecording && !isSaved && (
            <Button
              size="lg"
              onClick={saveAndTranscribe}
              disabled={isTranscribing || isLoadingModel}
              className="h-12 px-6"
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Transkribiert...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Speichern
                </>
              )}
            </Button>
          )}
        </div>

        {/* Hidden Audio Element für Wiedergabe */}
        <audio ref={audioElementRef} style={{ display: 'none' }} />
        
        {/* Status-Info */}
        {isLoadingModel && (
          <div className="mt-4 text-sm text-blue-700 bg-blue-100 p-2 rounded">
            <span className="flex items-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Lade Transkriptions-Modell... (Nur beim ersten Mal)
            </span>
          </div>
        )}
        
        {isRecording && (
          <div className="mt-4 text-sm text-blue-700 bg-blue-100 p-2 rounded">
            <span className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
              Aufnahme läuft... ({formatTime(recordingTime)})
            </span>
          </div>
        )}
        
        {hasRecording && !isRecording && !isSaved && !isTranscribing && (
          <div className="mt-4 text-sm text-blue-700 bg-blue-100 p-2 rounded">
            Aufnahme bereit. Klicken Sie auf "Speichern" für automatische deutsche Transkription.
          </div>
        )}
        
        {isTranscribing && (
          <div className="mt-4 text-sm text-orange-700 bg-orange-100 p-2 rounded">
            <span className="flex items-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Transkribiere Audio zu Text... Das kann einen Moment dauern.
            </span>
          </div>
        )}
        
        {isSaved && (
          <div className="mt-4 text-sm text-green-700 bg-green-100 p-2 rounded">
            ✓ Aufnahme gespeichert und erfolgreich transkribiert
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AudioRecorder;
