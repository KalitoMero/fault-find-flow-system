import { useState } from 'react';
import { toast } from "sonner";

interface N8nWebhookResponse {
  transcription?: string;
  text?: string;
  output?: string;
  error?: string;
}

export const useN8nWebhook = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string>('');

  const sendAudioToN8n = async (audioBlob: Blob, webhookUrl: string): Promise<string> => {
    if (!webhookUrl.trim()) {
      const error = 'N8N Webhook URL ist erforderlich';
      console.error('❌ N8N Error:', error);
      toast.error(error);
      throw new Error(error);
    }

    setIsProcessing(true);
    console.log('🚀 Starte N8N Audio-Upload...', {
      url: webhookUrl,
      audioBlobSize: audioBlob.size,
      audioBlobType: audioBlob.type
    });

    try {
      // Create FormData to send the audio file
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('timestamp', new Date().toISOString());
      formData.append('source', 'lovable-app');

      console.log('📤 Sende Audio an N8N Webhook:', webhookUrl);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let browser set it with boundary for FormData
      });

      console.log('📥 N8N Response Status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Keine Details verfügbar');
        console.error('❌ N8N HTTP Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }

      const contentType = response.headers.get('content-type');
      console.log('📥 N8N Response Content-Type:', contentType);

      const result: N8nWebhookResponse = await response.json();
      console.log('📥 N8N Response Data:', result);

      if (result.error) {
        console.error('❌ N8N returned error:', result.error);
        throw new Error(result.error);
      }

      // Handle different possible response formats from n8n
      const transcription = result.transcription || result.text || result.output || '';
      
      if (!transcription.trim()) {
        console.error('❌ Keine Transkription erhalten:', result);
        throw new Error('Keine Transkription von N8N erhalten. Bitte überprüfen Sie die N8N-Workflow-Konfiguration.');
      }

      console.log('✅ N8N Transkription erfolgreich erhalten:', transcription.substring(0, 100) + '...');
      toast.success('Audio erfolgreich von N8N verarbeitet');
      return transcription;

    } catch (error) {
      console.error('❌ Fehler beim Senden an N8N:', error);
      
      let errorMessage = 'Unbekannter Fehler';
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        errorMessage = 'Verbindung zu N8N fehlgeschlagen. Bitte überprüfen Sie:\n- Ist die N8N-URL korrekt?\n- Ist N8N erreichbar?\n- HTTPS/CORS-Einstellungen';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(`N8N Fehler: ${errorMessage}`, { duration: 5000 });
      throw error;
    } finally {
      setIsProcessing(false);
      console.log('🏁 N8N Verarbeitung abgeschlossen');
    }
  };

  return {
    sendAudioToN8n,
    isProcessing,
    webhookUrl,
    setWebhookUrl,
  };
};