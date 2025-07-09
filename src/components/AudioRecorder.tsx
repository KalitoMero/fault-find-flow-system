
import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Play, Pause, RotateCcw, Save, Loader2 } from 'lucide-react';
import { toast } from "sonner";

interface AudioRecorderProps {
  onTranscription: (transcription: string, audioBlob: string) => void;
  label: string;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onTranscription, label }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
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
      // Simuliere Transkription (in echter Anwendung würde hier ein Speech-to-Text Service aufgerufen)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simuliere deutsche Transkription basierend auf der Aufnahmedauer
      const mockTranscriptions = [
        "Das Problem tritt bei der Bearbeitung des Werkstücks auf. Die Maschine macht ungewöhnliche Geräusche und die Oberflächenqualität entspricht nicht den Vorgaben.",
        "Die Fehlerursache liegt vermutlich an einem verschlissenen Werkzeug. Die Schnittparameter müssen überprüft und angepasst werden.",
        "Als Korrekturmaßnahme wurde das Werkzeug gewechselt und die Maschinenparameter neu eingestellt. Eine Probefertigung wurde erfolgreich durchgeführt."
      ];
      
      const randomTranscription = mockTranscriptions[Math.floor(Math.random() * mockTranscriptions.length)];
      
      // Audio als Base64 String speichern (vereinfacht)
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        onTranscription(randomTranscription, base64Audio);
        setIsSaved(true);
        toast.success("Aufnahme gespeichert und transkribiert!");
      };
      
      reader.readAsDataURL(audioBlob);
      
    } catch (error) {
      console.error('Fehler bei der Transkription:', error);
      toast.error("Fehler bei der Transkription");
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
          {isSaved && <Badge className="bg-green-100 text-green-800">Gespeichert</Badge>}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Aufnahme Start/Stop */}
          {!isRecording ? (
            <Button
              variant="outline"
              size="lg"
              onClick={startRecording}
              disabled={isSaved}
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
              disabled={isTranscribing}
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
        {isRecording && (
          <div className="mt-4 text-sm text-blue-700 bg-blue-100 p-2 rounded">
            <span className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
              Aufnahme läuft... ({formatTime(recordingTime)})
            </span>
          </div>
        )}
        
        {hasRecording && !isRecording && !isSaved && (
          <div className="mt-4 text-sm text-blue-700 bg-blue-100 p-2 rounded">
            Aufnahme bereit. Klicken Sie auf "Speichern" für automatische Transkription.
          </div>
        )}
        
        {isSaved && (
          <div className="mt-4 text-sm text-green-700 bg-green-100 p-2 rounded">
            ✓ Aufnahme gespeichert und transkribiert
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AudioRecorder;
