import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Webhook, Settings, TestTube } from "lucide-react";

interface N8nWebhookSettingsProps {
  onSettingsChange: (enabled: boolean, url: string) => void;
}

const N8nWebhookSettings: React.FC<N8nWebhookSettingsProps> = ({ onSettingsChange }) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedUrl = localStorage.getItem('n8n_webhook_url') || '';
    const savedEnabled = localStorage.getItem('n8n_webhook_enabled') === 'true';
    
    setWebhookUrl(savedUrl);
    setIsEnabled(savedEnabled);
    onSettingsChange(savedEnabled, savedUrl);
  }, [onSettingsChange]);

  const handleUrlChange = (value: string) => {
    setWebhookUrl(value);
    localStorage.setItem('n8n_webhook_url', value);
    onSettingsChange(isEnabled, value);
  };

  const handleEnabledChange = (enabled: boolean) => {
    setIsEnabled(enabled);
    localStorage.setItem('n8n_webhook_enabled', enabled.toString());
    onSettingsChange(enabled, webhookUrl);
    
    if (enabled && !webhookUrl.trim()) {
      toast.warning('Bitte geben Sie eine N8N Webhook URL ein');
    }
  };

  const testWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast.error('Bitte geben Sie eine N8N Webhook URL ein');
      return;
    }

    setIsTesting(true);

    try {
      const testData = {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Test von Lovable App'
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      if (response.ok) {
        toast.success('N8N Webhook erfolgreich getestet');
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Webhook test failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      toast.error(`Webhook Test fehlgeschlagen: ${errorMessage}`);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          N8N Webhook Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="n8n-enabled"
            checked={isEnabled}
            onCheckedChange={handleEnabledChange}
          />
          <Label htmlFor="n8n-enabled">
            N8N Webhook für Audiotranskription aktivieren
          </Label>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="webhook-url">N8N Webhook URL</Label>
          <Input
            id="webhook-url"
            type="url"
            placeholder="https://your-n8n-instance.com/webhook/your-webhook-id"
            value={webhookUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            disabled={!isEnabled}
          />
          <p className="text-sm text-muted-foreground">
            Geben Sie die vollständige N8N Webhook URL ein. Die Audiodatei wird als FormData gesendet.
          </p>
        </div>

        {isEnabled && webhookUrl.trim() && (
          <Button
            onClick={testWebhook}
            disabled={isTesting}
            variant="outline"
            className="w-full"
          >
            <TestTube className="h-4 w-4 mr-2" />
            {isTesting ? 'Teste Webhook...' : 'Webhook testen'}
          </Button>
        )}

        <div className="bg-muted p-3 rounded-lg">
          <p className="text-sm font-medium mb-1">Erwartete N8N Response:</p>
          <code className="text-xs">
            {JSON.stringify({ transcription: "Ihr transkribierter Text hier" }, null, 2)}
          </code>
        </div>
      </CardContent>
    </Card>
  );
};

export default N8nWebhookSettings;