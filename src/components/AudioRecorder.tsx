import React, { useState, useRef } from 'react';
import { pipeline } from '@huggingface/transformers';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Play, Pause, RotateCcw, Save, Loader2, Languages, Settings, Eye, Edit3 } from 'lucide-react';
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cleanTranscriptionText, previewTextImprovements } from "@/lib/transcriptionCleaner";
import { useMemoryMonitor } from "@/hooks/useMemoryMonitor";

interface AudioRecorderProps {
  onTranscription: (transcription: string, audioBlob: string) => void;
  label: string;
}

// Cache für das Whisper-Modell
let transcriptionPipeline: any = null;

// Verfügbare Sprachen für bessere Transkription
const SUPPORTED_LANGUAGES = [
  { code: 'german', name: 'Deutsch', whisperCode: 'de' },
  { code: 'polish', name: 'Polnisch', whisperCode: 'pl' },
  { code: 'romanian', name: 'Rumänisch', whisperCode: 'ro' },
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
  
  // Neue States für Textverbesserung
  const [enableTextImprovement, setEnableTextImprovement] = useState(true);
  const [enableAICorrection, setEnableAICorrection] = useState(false);
  const [rawTranscription, setRawTranscription] = useState('');
  const [improvedTranscription, setImprovedTranscription] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showManualEdit, setShowManualEdit] = useState(false);
  const [manualText, setManualText] = useState('');
  const [previewData, setPreviewData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  
  // Memory monitoring
  const { memoryStats, isSupported: memorySupported, triggerGarbageCollection } = useMemoryMonitor(3000);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const convertAudioBlobToFloat32Array = async (audioBlob: Blob): Promise<Float32Array> => {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000
    });
    
    try {
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Simplified mono conversion
      let monoData: Float32Array;
      if (audioBuffer.numberOfChannels === 1) {
        monoData = audioBuffer.getChannelData(0);
      } else {
        // Simple stereo to mono mixing
        const leftChannel = audioBuffer.getChannelData(0);
        const rightChannel = audioBuffer.getChannelData(1);
        monoData = new Float32Array(leftChannel.length);
        
        for (let i = 0; i < leftChannel.length; i++) {
          monoData[i] = (leftChannel[i] + rightChannel[i]) * 0.5;
        }
      }
      
      // Linear resampling for better memory usage
      if (audioBuffer.sampleRate !== 16000) {
        const ratio = 16000 / audioBuffer.sampleRate;
        const resampledLength = Math.round(monoData.length * ratio);
        const resampledData = new Float32Array(resampledLength);
        
        // Simple linear interpolation
        for (let i = 0; i < resampledLength; i++) {
          const sourceIndex = i / ratio;
          const sourceIndexFloor = Math.floor(sourceIndex);
          const sourceIndexCeil = Math.min(sourceIndexFloor + 1, monoData.length - 1);
          const fraction = sourceIndex - sourceIndexFloor;
          
          resampledData[i] = monoData[sourceIndexFloor] * (1 - fraction) + monoData[sourceIndexCeil] * fraction;
        }
        
        // Clean up original data
        monoData = new Float32Array(0);
        
        return resampledData;
      }
      
      return monoData;
    } finally {
      audioContext.close();
    }
  };

  const initializeTranscriptionModel = async () => {
    if (transcriptionPipeline) return transcriptionPipeline;
    
    setIsLoadingModel(true);
    try {
      console.log('Lade verbessertes Whisper-Modell für präzise Transkription...');
      
      // Schnelles Whisper-Tiny für bessere Performance
      transcriptionPipeline = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-tiny', // Kleineres, schnelleres Modell
        {
          device: 'wasm',
          dtype: 'fp16'
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
          'Xenova/whisper-tiny',
          { device: 'wasm', dtype: 'fp16' }
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
    setRawTranscription('');
    setImprovedTranscription('');
    setManualText('');
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
    let workerRef: Worker | null = null;

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      console.log('Konvertiere Audio mit verbesserter Qualität...');
      const audioData = await convertAudioBlobToFloat32Array(audioBlob);
      
      // Optimized Web Worker for memory-efficient transcription
      workerRef = new Worker(new URL('../workers/optimizedTranscriptionWorker.ts', import.meta.url), {
        type: 'module'
      });
      
      // Optimierte Transkriptions-Parameter
      const selectedLang = SUPPORTED_LANGUAGES.find(lang => lang.code === selectedLanguage);
      const transcriptionOptions: any = {
        chunk_length_s: 20,
        stride_length_s: 3,
        return_timestamps: false,
        temperature: 0.0,
        compression_ratio_threshold: 2.4,
        logprob_threshold: -1.0,
        no_speech_threshold: 0.6,
        condition_on_previous_text: false
      };
      
      // Deutsche Sprachkonfiguration
      if (selectedLang && selectedLang.whisperCode) {
        transcriptionOptions.language = selectedLang.whisperCode;
        transcriptionOptions.task = 'transcribe';
        if (selectedLang.whisperCode === 'de') {
          transcriptionOptions.forced_decoder_ids = null;
          transcriptionOptions.suppress_tokens = [-1];
        }
        console.log(`Transkribiere in: ${selectedLang.name} (${selectedLang.whisperCode})`);
      } else {
        transcriptionOptions.language = 'de';
        transcriptionOptions.task = 'transcribe';
        transcriptionOptions.forced_decoder_ids = null;
        transcriptionOptions.suppress_tokens = [-1];
        console.log('Standard-Sprache: Deutsch');
      }
      
      // Promise für Worker-Kommunikation
      const transcriptionPromise = new Promise<{text: string, language: string}>((resolve, reject) => {
        workerRef!.onmessage = (event) => {
          const { type, text, language, progress, message, error } = event.data;
          
          switch (type) {
            case 'progress':
              toast.info(message || `Fortschritt: ${Math.round(progress)}%`);
              break;
            case 'complete':
              resolve({ text, language });
              break;
            case 'error':
              reject(new Error(error));
              break;
          }
        };
        
        workerRef!.onerror = (error) => {
          reject(new Error('Worker-Fehler: ' + error.message));
        };
      });
      
      // Starte Transkription im Worker
      toast.info('Starte Transkription (nicht-blockierend)...');
      workerRef.postMessage({
        type: 'transcribe',
        audioData: audioData,
        options: transcriptionOptions
      });
      
      const { text: transcribedText, language: detectedLang } = await transcriptionPromise;
      
      console.log('Rohtranskription erfolgreich:', transcribedText);
      console.log('Erkannte Sprache:', detectedLang);
      
      if (!transcribedText.trim()) {
        toast.warning('Keine Sprache erkannt. Bitte sprechen Sie deutlicher oder überprüfen Sie die Mikrofonqualität.');
        return;
      }
      
      // Speichere Rohtranskription
      setRawTranscription(transcribedText);
      
      // Apply basic or advanced text improvement
      let finalText = transcribedText;
      if (enableTextImprovement) {
        toast.info('Improving text with smart algorithms...');
        try {
          finalText = await cleanTranscriptionText(transcribedText, enableAICorrection);
          setImprovedTranscription(finalText);
          console.log('Improved transcription:', finalText);
        } catch (error) {
          console.warn('Text improvement failed, using basic transcription:', error);
          finalText = transcribedText; // Fallback to basic
          toast.warning('Advanced text improvement unavailable, using basic transcription');
        }
      }
      
      // Audio als Base64 String speichern
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        onTranscription(finalText, base64Audio);
        setIsSaved(true);
        
        const langInfo = detectedLang ? ` (${detectedLang.toUpperCase()})` : '';
        const improvementInfo = enableTextImprovement ? ' mit intelligenter Textverbesserung' : '';
        toast.success(`Aufnahme erfolgreich transkribiert${improvementInfo}!${langInfo}`);
      };
      
      reader.readAsDataURL(audioBlob);
      
    } catch (error) {
      console.error('Fehler bei der Transkription:', error);
      toast.error("Fehler bei der Transkription. Bitte versuchen Sie es erneut.");
    } finally {
      setIsTranscribing(false);
      
      // Cleanup worker
      if (workerRef) {
        workerRef.postMessage({ type: 'cleanup' });
        workerRef.terminate();
        workerRef = null;
      }
    }
  };

  const saveManualEdit = () => {
    if (manualText.trim()) {
      const reader = new FileReader();
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        onTranscription(manualText.trim(), base64Audio);
        setIsSaved(true);
        setShowManualEdit(false);
        toast.success('Manuell bearbeitete Transkription gespeichert!');
      };
      reader.readAsDataURL(audioBlob);
    }
  };

  const showTextPreview = async () => {
    if (!rawTranscription) return;
    
    setIsProcessing(true);
    setProcessingStatus('Erstelle erweiterte Textvorschau...');
    setShowPreview(true);
    
    try {
      const preview = await previewTextImprovements(rawTranscription);
      setPreviewData(preview);
    } catch (error) {
      console.error('Fehler bei Textvorschau:', error);
      toast.error('Fehler beim Erstellen der Textvorschau');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
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
            {detectedLanguage && <Badge variant="outline" className="bg-yellow-50">
              <Languages className="w-3 h-3 mr-1" />
              {detectedLanguage.toUpperCase()}
            </Badge>}
            {enableTextImprovement && <Badge variant="outline" className="bg-green-50">
              Smart Text ON
            </Badge>}
            {memorySupported && memoryStats && (
              <Badge 
                variant="outline" 
                className={`${memoryStats.isCritical ? 'bg-red-50 text-red-700' : 
                  memoryStats.isHigh ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50'}`}
              >
                Memory: {memoryStats.usagePercentage.toFixed(0)}%
              </Badge>
            )}
            {isSaved && <Badge className="bg-green-100 text-green-800">Gespeichert</Badge>}
          </div>
        </div>

        {/* Sprachauswahl und Einstellungen */}
        {!hasRecording && (
          <div className="space-y-4 mb-4">
            <div>
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
            
            {/* Erweiterte Einstellungen */}
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Erweiterte Textverbesserung</Label>
                <Switch 
                  checked={enableTextImprovement} 
                  onCheckedChange={setEnableTextImprovement}
                />
              </div>
              <p className="text-xs text-gray-600 mb-3">
                Entfernt Füllwörter (äh, ehm), korrigiert häufige Fehler und verbessert die Satzstruktur
              </p>
              
              {enableTextImprovement && (
                <div className="flex items-center justify-between">
                  <Label className="text-sm">KI-basierte Grammatikkorrektur (experimentell)</Label>
                  <Switch 
                    checked={enableAICorrection} 
                    onCheckedChange={setEnableAICorrection}
                  />
                </div>
              )}
            </div>
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

        {/* Zusätzliche Aktionen nach Transkription */}
        {rawTranscription && !isSaved && (
          <div className="flex space-x-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={showTextPreview}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              Vorschau
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setManualText(improvedTranscription || rawTranscription);
                setShowManualEdit(true);
              }}
              className="flex-1"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Bearbeiten
            </Button>
          </div>
        )}

        {/* Vorschau Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Textverbesserungs-Vorschau</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {isProcessing ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span>{processingStatus}</span>
                </div>
              ) : previewData ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Original:</Label>
                    <p className="mt-1 p-2 bg-muted rounded text-sm">{previewData.original}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Ohne Füllwörter:</Label>
                    <p className="mt-1 p-2 bg-muted rounded text-sm">{previewData.withoutFillers}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Mit Fehlerkorrekturen:</Label>
                    <p className="mt-1 p-2 bg-muted rounded text-sm">{previewData.withErrorCorrection}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Strukturverbesserungen:</Label>
                    <p className="mt-1 p-2 bg-muted rounded text-sm">{previewData.withStructureImprovement}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Kontextuelle Verbesserungen:</Label>
                    <p className="mt-1 p-2 bg-muted rounded text-sm">{previewData.withContextualImprovements}</p>
                  </div>
                  {previewData.detectedDomains && previewData.detectedDomains.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Erkannte Domänen:</Label>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {previewData.detectedDomains.map((domain: string) => (
                          <Badge key={domain} variant="secondary" className="text-xs">
                            {domain}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {previewData.entities && previewData.entities.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Erkannte Entitäten:</Label>
                      <div className="mt-1 space-y-1">
                        {previewData.entities.slice(0, 5).map((entity: any, idx: number) => (
                          <div key={idx} className="text-xs bg-accent/10 p-2 rounded">
                            <span className="font-medium">{entity.word}</span> - {entity.entity} 
                            <span className="text-muted-foreground ml-2">({Math.round(entity.score * 100)}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium text-primary">Finaler Text (mit KI-Verbesserungen):</Label>
                    <p className="mt-1 p-2 bg-accent/10 rounded text-sm font-medium">{previewData.final}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Keine Vorschau verfügbar</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Manuelle Bearbeitung Dialog */}
        <Dialog open={showManualEdit} onOpenChange={setShowManualEdit}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Text manuell bearbeiten</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Bearbeiten Sie hier den transkribierten Text..."
                className="min-h-32"
              />
              <div className="flex space-x-2">
                <Button onClick={saveManualEdit} className="flex-1">
                  Speichern
                </Button>
                <Button variant="outline" onClick={() => setShowManualEdit(false)}>
                  Abbrechen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
            Aufnahme bereit. Klicken Sie auf "Speichern" für automatische Transkription{enableTextImprovement ? ' mit intelligenter Textverbesserung' : ''}.
          </div>
        )}
        
        {isTranscribing && (
          <div className="mt-4 text-sm text-orange-700 bg-orange-100 p-2 rounded">
            <span className="flex items-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {enableTextImprovement ? 'Transkribiere und verbessere Text automatisch...' : 'Transkribiere Audio zu Text...'} Das kann einen Moment dauern.
            </span>
          </div>
        )}
        
        {isSaved && (
          <div className="mt-4 text-sm text-green-700 bg-green-100 p-2 rounded">
            ✓ Aufnahme gespeichert und erfolgreich transkribiert{enableTextImprovement ? ' mit erweiterten Textverbesserungen' : ''}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AudioRecorder;
