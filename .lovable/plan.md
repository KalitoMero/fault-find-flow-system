# N8N-Einstellungen speicherbar machen

Zwei Änderungen: eine im Backend (Ursache), eine im Frontend (Speichern-Button).

## 1) Backend: `server/src/routes/settings.ts`

Ursache: Die generischen Routen `/:key` stehen vor `/n8n`. Express nimmt den ersten Treffer, also landet `PUT /api/settings/n8n` in `/:key` → `requireRole('admin')` blockt Nicht-Admins (403), und bei Admins sorgt `if (...) return;` dafür, dass nie eine Antwort gesendet wird (Request hängt). Gleiches bei `GET`.

Fix: Die N8N-Block (aktuell Zeilen 44-79) **nach oben verschieben**, direkt unter `const router = Router();` (Zeile 5), und die beiden Guard-Zeilen 10 und 21 löschen.

Die Datei sieht danach am Anfang so aus:

```ts
const router = Router();

// === N8N SETTINGS ===

// GET /api/settings/n8n
router.get('/n8n', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await query(
      'SELECT * FROM n8n_settings WHERE user_id = $1 OR user_id IS NULL ORDER BY user_id DESC NULLS LAST LIMIT 1',
      [req.userId]
    );
    res.json(rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der N8N-Einstellungen' });
  }
});

// PUT /api/settings/n8n
router.put('/n8n', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { webhook_url, is_enabled } = req.body;
    const existing = await query('SELECT id FROM n8n_settings WHERE user_id = $1', [req.userId]);
    if (existing.rows.length > 0) {
      await query(
        'UPDATE n8n_settings SET webhook_url = $1, is_enabled = $2 WHERE user_id = $3',
        [webhook_url, is_enabled, req.userId]
      );
    } else {
      await query(
        'INSERT INTO n8n_settings (user_id, webhook_url, is_enabled) VALUES ($1, $2, $3)',
        [req.userId, webhook_url, is_enabled]
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Speichern der N8N-Einstellungen' });
  }
});

// GET /api/settings/:key
router.get('/:key', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await query('SELECT * FROM app_settings WHERE key = $1', [req.params.key]);
    res.json(rows[0] || null);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Einstellung' });
  }
});

// PUT /api/settings/:key
router.put('/:key', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { value } = req.body;
    await query(
      'INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      [req.params.key, value]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Speichern der Einstellung' });
  }
});
```

Der Rest der Datei (DELETE `/:key`, Deputies, Resources) bleibt unverändert. Wichtig: Die `deputies`- und `resources`-Routen müssen ebenfalls **vor** die generischen `/:key`-Routen — sie haben zwar mehrteilige Pfade (`/deputies/list`, `/resources/:id`), aber `PUT /deputies` kollidiert mit `PUT /:key`, also den ganzen Deputy-/Resource-Block ebenfalls über die `/:key`-Routen ziehen.

Danach Server neu bauen und neu starten:
```bash
cd server && npm run build && pm2 restart fehlermeldesystem   # bzw. systemctl restart ...
```

## 2) Frontend: `src/components/N8nWebhookSettings.tsx`

Auto-Save bei jedem Tastenanschlag durch einen expliziten Speichern-Button ersetzen.

State ergänzen (nach Zeile 18):
```ts
const [isSaving, setIsSaving] = useState(false);
```

`handleUrlChange` (Zeilen 41-57) und `handleEnabledChange` (Zeilen 59-81) ersetzen durch:
```ts
  const handleUrlChange = (value: string) => {
    setWebhookUrl(value);
    onSettingsChange(isEnabled, value);
  };

  const handleEnabledChange = (enabled: boolean) => {
    setIsEnabled(enabled);
    onSettingsChange(enabled, webhookUrl);
  };

  const saveSettings = async () => {
    if (isEnabled && !webhookUrl.trim()) {
      toast.error('Bitte geben Sie eine N8N Webhook URL ein');
      return;
    }
    setIsSaving(true);
    try {
      await api.put('/api/settings/n8n', {
        webhook_url: webhookUrl,
        is_enabled: isEnabled,
      });
      window.dispatchEvent(new CustomEvent('n8n-settings-updated'));
      onSettingsChange(isEnabled, webhookUrl);
      toast.success('N8N Einstellungen gespeichert');
    } catch (error) {
      console.error('Error saving N8N settings:', error);
      toast.error('Fehler beim Speichern der Einstellungen');
    } finally {
      setIsSaving(false);
    }
  };
```

Speichern-Button einfügen — direkt nach dem schließenden `</div>` des URL-Blocks (nach Zeile 153, vor dem `{isEnabled && webhookUrl.trim() && (`-Block):
```tsx
        <Button onClick={saveSettings} disabled={isSaving} className="w-full">
          <Settings className="h-4 w-4 mr-2" />
          {isSaving ? 'Speichert...' : 'Einstellungen speichern'}
        </Button>
```

Zusätzlich in Zeile 148 `disabled={!isEnabled}` am Input entfernen, damit die URL auch vor dem Aktivieren eingetragen werden kann.

## Prüfen

1. Einloggen (auch als Nicht-Admin), N8N aktivieren, URL eintragen, Speichern → Toast "gespeichert".
2. Seite neu laden → Werte sind noch da.
3. In der DB: `SELECT * FROM n8n_settings;`
