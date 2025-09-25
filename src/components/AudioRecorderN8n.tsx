import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, RotateCcw, Save, Loader2, Webhook } from 'lucide-react';
import { toast } from "sonner";
import { useN8nWebhook } from "@/hooks/useN8nWebhook";

interface AudioRecorderN8nProps {
  onTranscription: (transcription: string, audioBlob: string) => void;
  label: string;
  webhookUrl: string;
  useN8n: boolean;
}

const AudioRecorderN8n: React.FC<AudioRecorderN8nProps> = ({ 
  onTranscription, 
  label, 
  webhookUrl, 
  useN8n 
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { sendAudioToN8n, isProcessing } = useN8nWebhook();

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

  const stopRecording = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      toast.success("Aufnahme beendet");
      
      // Automatisch nach kurzer Verzögerung an N8n senden
      setTimeout(() => {
        if (audioChunksRef.current.length > 0) {
          saveAndProcess();
        }
      }, 500);
    }
  };

  const resetRecording = () => {
    if (isRecording) {
      stopRecording();
    }
    
    setHasRecording(false);
    setIsSaved(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
    
    toast.info("Aufnahme zurückgesetzt");
  };

  const saveAndProcess = async () => {
    console.log('🎵 AudioRecorderN8n: Starting save and process...');
    console.log('🔧 N8N Integration Status:', { 
      webhookUrl: webhookUrl.trim(), 
      hasUrl: !!webhookUrl.trim(),
      useN8n,
      hasRecording: hasRecording,
      audioChunksLength: audioChunksRef.current.length
    });

    if (!hasRecording || audioChunksRef.current.length === 0) {
      console.log('❌ No recording to process');
      toast.error("Keine Aufnahme zum Verarbeiten vorhanden");
      return;
    }

    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      let transcription = '';
      
      if (useN8n && webhookUrl.trim()) {
        console.log('🚀 AudioRecorderN8n: Sending to N8N webhook...', webhookUrl);
        // Send to N8N webhook
        transcription = await sendAudioToN8n(audioBlob, webhookUrl);
        console.log('✅ AudioRecorderN8n: N8N transcription received:', transcription.substring(0, 100) + '...');
      } else {
        // Fallback: inform user that N8N is not configured
        console.log('⚠️ AudioRecorderN8n: N8N not configured properly', { useN8n, hasUrl: !!webhookUrl.trim() });
        toast.warning('N8N Webhook ist nicht konfiguriert. Bitte aktivieren Sie N8N in den Einstellungen.');
        return;
      }
      
      // Save as base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        onTranscription(transcription, base64Audio);
        setIsSaved(true);
        
        console.log('✅ AudioRecorderN8n: Processing completed successfully');
        toast.success('Aufnahme erfolgreich verarbeitet!');
      };
      
      reader.readAsDataURL(audioBlob);
      
    } catch (error) {
      console.error('❌ AudioRecorderN8n: Processing error:', error);
      toast.error("Fehler bei der Verarbeitung. Bitte versuchen Sie es erneut.");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isProcessingAudio = isProcessing;

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

      {hasRecording && !isSaved && !isProcessingAudio && (
        <div className="flex flex-col gap-2" style={{ height: '112px' }}>
          <Button
            type="button"
            onClick={saveAndProcess}
            disabled={isProcessingAudio}
            variant="outline"
            size="sm"
            className="w-12 p-0"
            style={{ height: '56px' }}
          >
            <Save className="h-4 w-4" />
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

      {isProcessingAudio && (
        <div style={{ height: '112px' }}>
          <Button
            type="button"
            disabled
            variant="outline"
            size="sm"
            className="w-12 p-0"
            style={{ height: '112px' }}
          >
            <Loader2 className="h-4 w-4 animate-spin" />
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
      
      {/* Status badges */}
      <div className="flex flex-col gap-1 mt-auto">
        {useN8n && (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 text-[8px] px-1 py-0">
            <Webhook className="h-2 w-2 mr-1" />
            N8N
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

export default AudioRecorderN8n;