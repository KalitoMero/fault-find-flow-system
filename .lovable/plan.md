# Teamleiter-Dashboard-Button anzeigen (+ offener N8N-Fix)

## Problem

Ein Teamleiter hat in `user_roles` meist **zwei** Rollen: `employee` (wird bei der Registrierung automatisch vergeben) und `teamleader`. In `src/hooks/useAuth.tsx` wird aber nur `roles[0]` genommen (Zeile 57 und Zeile 99), und die SQL-Abfrage in `server/src/middleware/auth.ts` hat kein `ORDER BY` — die Reihenfolge ist also zufällig. Kommt `employee` zuerst, wird der Teamleiter als Mitarbeiter behandelt und der Dashboard-Button in `src/pages/Index.tsx` (Prüfung `profile.role === 'teamleader'`) fehlt.

## Fix: `src/hooks/useAuth.tsx`

### 1) Hilfsfunktion einfügen — direkt nach Zeile 29 (`const AuthContext = createContext...`)

```ts
const ROLE_PRIORITY = ['admin', 'management', 'teamleader', 'employee'] as const;

const resolveRole = (roles: string[] = []): UserProfile['role'] => {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return role;
  }
  return 'employee';
};
```

### 2) In `loadCurrentUser` — Zeile 57 ersetzen

```ts
        role: (roles[0] || 'employee') as any,   // vorher
        role: resolveRole(roles),                // nachher
```

### 3) In `login` — Zeile 99 ersetzen

```ts
          role: (data.user.roles?.[0] || 'employee') as any,   // vorher
          role: resolveRole(data.user.roles),                  // nachher
```

Damit gewinnt immer die höchste Rolle: `admin` > `management` > `teamleader` > `employee`.

### Danach

Frontend neu bauen und ausliefern (`npm run build`), dann **neu einloggen** — das Profil wird nur beim Login bzw. Laden gesetzt.

### Falls der Button danach immer noch fehlt

Prüfen, ob die Teamleiter-Rolle in der DB überhaupt gesetzt ist:
```sql
SELECT p.name, ur.role FROM user_roles ur JOIN profiles p ON p.id = ur.user_id;
```
Fehlt `teamleader`, ergänzen:
```sql
INSERT INTO user_roles (user_id, role) VALUES ('<user-uuid>', 'teamleader')
ON CONFLICT (user_id, role) DO NOTHING;
```

---

# Offen: N8N-Einstellungen speichern

## Backend: `server/src/routes/settings.ts`

Der N8N-GET-Block steht bereits oben. Der **PUT** muss ebenfalls oben stehen **und** global speichern (`user_id IS NULL`), passend zum GET:

```ts
// PUT /api/settings/n8n  -- muss VOR router.put('/:key', ...) stehen
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
```

Außerdem in den generischen Routen die Guard-Zeilen `if (['n8n', 'deputies', 'resources'].includes(req.params.key)) return;` löschen (Zeile 10 und 21) — sie lassen Requests hängen.

## Frontend: `src/components/N8nWebhookSettings.tsx`

### a) State ergänzen (nach Zeile 18)
```ts
  const [isSaving, setIsSaving] = useState(false);
```

### b) `handleUrlChange` (41-57) und `handleEnabledChange` (59-81) ersetzen
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
      await api.put('/api/settings/n8n', { webhook_url: webhookUrl, is_enabled: isEnabled });
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

### c) Input Zeile 148 `disabled={!isEnabled}` entfernen

### d) Speichern-Button nach Zeile 153 (`</div>` des URL-Blocks) einfügen
```tsx
        <Button onClick={saveSettings} disabled={isSaving} className="w-full">
          <Settings className="h-4 w-4 mr-2" />
          {isSaving ? 'Speichert...' : 'Einstellungen speichern'}
        </Button>
```

Wichtig: Frontend-Änderungen erscheinen erst nach einem neuen Build/Deploy des React-Teils — ein Backend-Neustart genügt nicht.
