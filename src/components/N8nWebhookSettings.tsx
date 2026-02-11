import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Webhook, Settings, TestTube } from "lucide-react";
import api from '@/lib/apiClient';

interface N8nWebhookSettingsProps {
  onSettingsChange: (enabled: boolean, url: string) => void;
}

const N8nWebhookSettings: React.FC<N8nWebhookSettingsProps> = ({ onSettingsChange }) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Load global N8N settings from Supabase on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await api.get('/api/settings/n8n');
        
        const url = settings?.webhook_url || '';
        const enabled = settings?.is_enabled || false;
        
        setWebhookUrl(url);
        setIsEnabled(enabled);
        onSettingsChange(enabled, url);
        console.log('🔧 Global N8N Settings loaded:', { enabled, url });
      } catch (error) {
        console.error('Error loading N8N settings:', error);
      }
    };
    
    loadSettings();
  }, [onSettingsChange]);

  const handleUrlChange = async (value: string) => {
    setWebhookUrl(value);
    onSettingsChange(isEnabled, value);
    
    try {
      await api.put('/api/settings/n8n', {
        webhook_url: value,
        is_enabled: isEnabled,
      });
      
      window.dispatchEvent(new CustomEvent('n8n-settings-updated'));
      console.log('🔧 Global N8N URL updated:', value);
    } catch (error) {
      console.error('Error saving N8N URL:', error);
      toast.error('Fehler beim Speichern der URL');
    }
  };

  const handleEnabledChange = async (enabled: boolean) => {
    setIsEnabled(enabled);
    onSettingsChange(enabled, webhookUrl);
    
    try {
      await api.put('/api/settings/n8n', {
        webhook_url: webhookUrl,
        is_enabled: enabled,
      });
      
      window.dispatchEvent(new CustomEvent('n8n-settings-updated'));
      console.log('🔧 Global N8N enabled state changed:', enabled);
      
      if (enabled && !webhookUrl.trim()) {
        toast.warning('Bitte geben Sie eine N8N Webhook URL ein');
      } else if (enabled && webhookUrl.trim()) {
        toast.success('N8N Integration aktiviert');
      }
    } catch (error) {
      console.error('Error saving N8N enabled state:', error);
      toast.error('Fehler beim Speichern der Einstellung');
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