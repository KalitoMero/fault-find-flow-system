import { useState } from 'react';
import { toast } from "sonner";

interface N8nWebhookResponse {
  transcription?: string;
  text?: string;
  error?: string;
}

export const useN8nWebhook = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string>('');

  const sendAudioToN8n = async (audioBlob: Blob, webhookUrl: string): Promise<string> => {
    if (!webhookUrl.trim()) {
      throw new Error('N8N Webhook URL ist erforderlich');
    }

    setIsProcessing(true);

    try {
      // Create FormData to send the audio file
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('timestamp', new Date().toISOString());
      formData.append('source', 'lovable-app');

      console.log('Sende Audio an N8N Webhook:', webhookUrl);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let browser set it with boundary for FormData
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: N8nWebhookResponse = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // Handle different possible response formats from n8n
      const transcription = result.transcription || result.text || '';
      
      if (!transcription.trim()) {
        throw new Error('Keine Transkription von N8N erhalten');
      }

      toast.success('Audio erfolgreich von N8N verarbeitet');
      return transcription;

    } catch (error) {
      console.error('Fehler beim Senden an N8N:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      toast.error(`N8N Fehler: ${errorMessage}`);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    sendAudioToN8n,
    isProcessing,
    webhookUrl,
    setWebhookUrl,
  };
};