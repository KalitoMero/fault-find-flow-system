# N8N-Einstellungen speicherbar machen (Code zum Einfügen)

Du hast den N8N-Block bereits nach oben verschoben und GET auf globale Einstellungen (`user_id IS NULL`) umgestellt. Hier der exakte Code für den Rest.

## 1) Backend: `server/src/routes/settings.ts` — oberer Bereich

Den Block von `const router = Router();` bis zum Start von `// === DEPUTY ASSIGNMENTS ===` **komplett ersetzen** durch:

```ts
const router = Router();

// === N8N SETTINGS ===
// WICHTIG: Diese spezifischen Routen müssen VOR /:key stehen!

// GET /api/settings/n8n
router.get('/n8n', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await query(
      'SELECT * FROM n8n_settings WHERE user_id IS NULL ORDER BY id LIMIT 1'
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
    const existing = await query('SELECT id FROM n8n_settings WHERE user_id IS NULL');
    if (existing.rows.length > 0) {
      await query(
        'UPDATE n8n_settings SET webhook_url = $1, is_enabled = $2 WHERE user_id IS NULL',
        [webhook_url, is_enabled]
      );
    } else {
      await query(
        'INSERT INTO n8n_settings (user_id, webhook_url, is_enabled) VALUES (NULL, $1, $2)',
        [webhook_url, is_enabled]
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Speichern der N8N-Einstellungen' });
  }
});

// === GENERISCHE EINSTELLUNGEN (müssen UNTER den spezifischen Routen stehen) ===

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

// DELETE /api/settings/:key
router.delete('/:key', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    await query('DELETE FROM app_settings WHERE key = $1', [req.params.key]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Löschen der Einstellung' });
  }
});
```

Änderungen gegenüber vorher:
- N8N-Block (GET + PUT) steht **oben**, generische `/:key`-Routen **darunter**.
- Die `if (['n8n',...].includes(...)) return;`-Guard-Zeilen sind **entfallen**.
- PUT speichert jetzt auch **global** (`user_id IS NULL`), passend zu deinem GET.
- `DELETE /:key` bleibt unten (kollidiert nicht).

> Hinweis: Falls `n8n_settings.user_id` eine `NOT NULL`-Constraint hat, schlägt `VALUES (NULL, ...)` fehl. Prüfe `server/schema.sql` — falls NOT NULL, ändere die Spalte: `ALTER TABLE n8n_settings ALTER COLUMN user_id DROP NOT NULL;`

Der Rest der Datei (Deputy Assignments, Teamleader Resources ab `// === DEPUTY ASSIGNMENTS ===`) bleibt unverändert. Diese mehrteiligen Pfade (`/deputies/list`, `/resources/:id`) kollidieren nicht mit `/:key`, weil sie einen zweiten Pfadteil haben — die Reihenfolge zu `/:key` ist egal.

Danach Server neu bauen/neu starten:
```bash
cd server && npm run build && pm2 restart fehlermeldesystem   # bzw. systemctl restart ...
```

## 2) Frontend: `src/components/N8nWebhookSettings.tsx`

Auto-Save bei jedem Tastenanschlag → expliziter Speichern-Button.

### a) State ergänzen (Zeile 18, nach `isTesting`)
```ts
  const [isSaving, setIsSaving] = useState(false);
```

### b) `handleUrlChange` (Zeilen 41-57) und `handleEnabledChange` (Zeilen 59-81) ersetzen durch:
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

### c) Input: `disabled` entfernen (Zeile 148)
```tsx
            // vorher:  disabled={!isEnabled}
            // danach:  (Zeile ganz löschen)
```
Damit die URL auch vor dem Aktivieren eintragbar ist.

### d) Speichern-Button einfügen — nach dem `</div>` des URL-Blocks (Zeile 153), vor dem `{isEnabled && webhookUrl.trim() && (`-Block (Zeile 155):
```tsx
        <Button onClick={saveSettings} disabled={isSaving} className="w-full">
          <Settings className="h-4 w-4 mr-2" />
          {isSaving ? 'Speichert...' : 'Einstellungen speichern'}
        </Button>
```
`Settings` wird oben bereits importiert (Zeile 8: `import { Webhook, Settings, TestTube } from "lucide-react";`) — kein neuer Import nötig.

## Prüfen
1. Einloggen (auch Nicht-Admin), N8N aktivieren, URL eintragen, **Einstellungen speichern** → Toast "gespeichert".
2. Seite neu laden → Werte bleiben.
3. DB: `SELECT * FROM n8n_settings;` → eine Zeile mit `user_id IS NULL`.
