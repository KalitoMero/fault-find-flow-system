import React, { useState, useRef } from 'react';
import { pipeline } from '@huggingface/transformers';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Play, Pause, RotateCcw, Save, Loader2, Languages } from 'lucide-react';
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AudioRecorderProps {
  onTranscription: (transcription: string, audioBlob: string) => void;
  label: string;
}

// Cache für das Whisper-Modell
let transcriptionPipeline: any = null;

// Verfügbare Sprachen für bessere Transkription
const SUPPORTED_LANGUAGES = [
  { code: 'german', name: 'Deutsch', whisperCode: 'de' },
  { code: 'english', name: 'English', whisperCode: 'en' },
  { code: 'french', name: 'Français', whisperCode: 'fr' },
  { code: 'spanish', name: 'Español', whisperCode: 'es' },
  { code: 'italian', name: 'Italiano', whisperCode: 'it' },
  { code: 'portuguese', name: 'Português', whisperCode: 'pt' },
  { code: 'dutch', name: 'Nederlands', whisperCode: 'nl' },
  { code: 'auto', name: 'Automatisch erkennen', whisperCode: null }
];

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onTranscription, label }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('german');
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Verbesserte Audio-Konvertierung mit besserer Qualität
  const convertAudioBlobToFloat32Array = async (audioBlob: Blob): Promise<Float32Array> => {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000 // Whisper-optimierte Sample-Rate
    });
    
    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Konvertiere zu Mono mit besserer Qualität
      let monoData: Float32Array;
      if (audioBuffer.numberOfChannels === 1) {
        monoData = audioBuffer.getChannelData(0);
      } else {
        // Mische Stereo-Kanäle intelligent
        const leftChannel = audioBuffer.getChannelData(0);
        const rightChannel = audioBuffer.getChannelData(1);
        monoData = new Float32Array(leftChannel.length);
        
        for (let i = 0; i < leftChannel.length; i++) {
          monoData[i] = (leftChannel[i] + rightChannel[i]) * 0.5;
        }
      }
      
      // Verbesserte Resampling-Algorithmus
      if (audioBuffer.sampleRate !== 16000) {
        const ratio = 16000 / audioBuffer.sampleRate;
        const resampledLength = Math.round(monoData.length * ratio);
        const resampledData = new Float32Array(resampledLength);
        
        // Lanczos-ähnliche Interpolation für bessere Qualität
        for (let i = 0; i < resampledLength; i++) {
          const sourceIndex = i / ratio;
          const sourceIndexFloor = Math.floor(sourceIndex);
          const sourceIndexCeil = Math.min(sourceIndexFloor + 1, monoData.length - 1);
          const fraction = sourceIndex - sourceIndexFloor;
          
          // Kubische Interpolation für bessere Audioqualität
          if (sourceIndexFloor > 0 && sourceIndexCeil < monoData.length - 1) {
            const p0 = monoData[sourceIndexFloor - 1];
            const p1 = monoData[sourceIndexFloor];
            const p2 = monoData[sourceIndexCeil];
            const p3 = monoData[sourceIndexCeil + 1];
            
            resampledData[i] = p1 + 0.5 * fraction * (p2 - p0 + fraction * (2 * p0 - 5 * p1 + 4 * p2 - p3 + fraction * (3 * (p1 - p2) + p3 - p0)));
          } else {
            // Fallback auf lineare Interpolation
            resampledData[i] = monoData[sourceIndexFloor] * (1 - fraction) + monoData[sourceIndexCeil] * fraction;
          }
        }
        
        return resampledData;
      }
      
      return monoData;
    } finally {
      audioContext.close();
    }
  };

  // Verbesserte Modell-Initialisierung
  const initializeTranscriptionModel = async () => {
    if (transcriptionPipeline) return transcriptionPipeline;
    
    setIsLoadingModel(true);
    try {
      console.log('Lade verbessertes Whisper-Modell für präzise Transkription...');
      
      // Verwende das bessere Whisper-Base-Modell für höhere Genauigkeit
      transcriptionPipeline = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-base', // Größeres Modell für bessere Genauigkeit
        {
          device: 'wasm',
          // Optimierte Konfiguration für bessere Leistung
          dtype: 'fp32',
          revision: 'main'
        }
      );
      
      console.log('Verbessertes Whisper-Modell erfolgreich geladen');
      toast.success('Hochwertiges Transkriptions-Modell geladen');
      return transcriptionPipeline;
    } catch (error) {
      console.error('Fehler beim Laden des Modells:', error);
      // Fallback auf kleineres Modell
      try {
        console.log('Lade Fallback-Modell...');
        transcriptionPipeline = await pipeline(
          'automatic-speech-recognition',
          'Xenova/whisper-small',
          { device: 'wasm' }
        );
        toast.warning('Fallback-Modell geladen - Qualität möglicherweise eingeschränkt');
        return transcriptionPipeline;
      } catch (fallbackError) {
        console.error('Fallback-Modell konnte nicht geladen werden:', fallbackError);
        toast.error('Fehler beim Laden des Transkriptions-Modells');
        throw fallbackError;
      }
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
          // Hochwertige Aufnahme-Einstellungen
          sampleRate: { ideal: 48000, min: 16000 }, // Höhere Sample-Rate für bessere Qualität
          channelCount: { ideal: 2, min: 1 }, // Stereo falls verfügbar
        } 
      });
      
      // Verbesserte MediaRecorder-Konfiguration
      const options = [
        { mimeType: 'audio/webm;codecs=opus', bitrate: 128000 },
        { mimeType: 'audio/mp4;codecs=mp4a.40.2', bitrate: 128000 },
        { mimeType: 'audio/webm', bitrate: 128000 },
        { mimeType: 'audio/ogg;codecs=opus', bitrate: 128000 }
      ];
      
      let mediaRecorder: MediaRecorder | null = null;
      for (const option of options) {
        if (MediaRecorder.isTypeSupported(option.mimeType)) {
          mediaRecorder = new MediaRecorder(stream, option);
          break;
        }
      }
      
      if (!mediaRecorder) {
        mediaRecorder = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setDetectedLanguage(null); // Reset bei neuer Aufnahme

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder?.mimeType || 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioElementRef.current) {
          audioElementRef.current.src = audioUrl;
        }
        
        setHasRecording(true);
      };

      // Aufnahme in höherer Qualität
      mediaRecorder.start(100); // 100ms Intervalle für konsistente Qualität
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success("Hochwertige Aufnahme gestartet");
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
      const model = await initializeTranscriptionModel();
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      console.log('Konvertiere Audio mit verbesserter Qualität...');
      const audioData = await convertAudioBlobToFloat32Array(audioBlob);
      
      console.log('Starte präzise Transkription...');
      toast.info('Führe hochwertige Transkription durch...');
      
      // Optimierte Transkriptions-Parameter für bessere Genauigkeit
      const selectedLang = SUPPORTED_LANGUAGES.find(lang => lang.code === selectedLanguage);
      const transcriptionOptions: any = {
        // Chunk-basierte Verarbeitung für bessere Genauigkeit
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
        // Verbesserte Dekodierungs-Parameter
        temperature: 0.0, // Deterministische Ausgabe für Konsistenz
        compression_ratio_threshold: 2.4,
        logprob_threshold: -1.0,
        no_speech_threshold: 0.6,
        condition_on_previous_text: true
      };
      
      // Sprachspezifische Konfiguration
      if (selectedLang && selectedLang.whisperCode) {
        transcriptionOptions.language = selectedLang.whisperCode;
        transcriptionOptions.task = 'transcribe'; // Transkription in der Originalsprache
        console.log(`Transkribiere in: ${selectedLang.name}`);
      } else {
        // Automatische Spracherkennung
        transcriptionOptions.task = 'transcribe';
        console.log('Automatische Spracherkennung aktiviert');
      }
      
      const result = await model(audioData, transcriptionOptions);
      
      let transcribedText = '';
      let detectedLang = '';
      
      if (result.chunks && result.chunks.length > 0) {
        // Verwende Chunk-basierte Transkription für bessere Qualität
        transcribedText = result.chunks.map((chunk: any) => chunk.text).join(' ').trim();
      } else {
        transcribedText = result.text || '';
      }
      
      // Spracherkennung aus dem Modell-Output
      if (result.language) {
        detectedLang = result.language;
        setDetectedLanguage(detectedLang);
      }
      
      console.log('Transkription erfolgreich:', transcribedText);
      console.log('Erkannte Sprache:', detectedLang);
      
      if (!transcribedText.trim()) {
        toast.warning('Keine Sprache erkannt. Bitte sprechen Sie deutlicher oder überprüfen Sie die Mikrofonqualität.');
        return;
      }
      
      // Nachbearbeitung für bessere Textqualität
      const cleanedText = cleanTranscriptionText(transcribedText);
      
      // Audio als Base64 String speichern
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        onTranscription(cleanedText, base64Audio);
        setIsSaved(true);
        
        const langInfo = detectedLang ? ` (${detectedLang.toUpperCase()})` : '';
        toast.success(`Aufnahme erfolgreich transkribiert!${langInfo}`);
      };
      
      reader.readAsDataURL(audioBlob);
      
    } catch (error) {
      console.error('Fehler bei der Transkription:', error);
      toast.error("Fehler bei der Transkription. Bitte versuchen Sie es erneut.");
    } finally {
      setIsTranscribing(false);
    }
  };

  // Textbereinigung für bessere Qualität
  const cleanTranscriptionText = (text: string): string => {
    return text
      .trim()
      // Entferne mehrfache Leerzeichen
      .replace(/\s+/g, ' ')
      // Korrigiere häufige Transkriptionsfehler
      .replace(/\b(ähm|äh|mhm|hmm)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      // Erstes Wort großschreiben
      .replace(/^./, match => match.toUpperCase())
      // Satzzeichen normalisieren
      .replace(/([.!?])\s*$/, '$1');
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
            {detectedLanguage && <Badge variant="outline" className="bg-yellow-50">
              <Languages className="w-3 h-3 mr-1" />
              {detectedLanguage.toUpperCase()}
            </Badge>}
            {isSaved && <Badge className="bg-green-100 text-green-800">Gespeichert</Badge>}
          </div>
        </div>

        {/* Sprachauswahl */}
        {!hasRecording && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-blue-900 mb-2">
              Sprache für Transkription:
            </label>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
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
