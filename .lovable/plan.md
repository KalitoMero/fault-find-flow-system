# N8N-Einstellungen: Speichern reparieren

## Diagnose (bestätigt durch Code-Reads)

**Hauptursache – Backend-Route-Reihenfolge** in `server/src/routes/settings.ts`:
- `PUT /:key` (Zeile 20) und `GET /:key` (Zeile 8) sind **vor** den spezifischen Routen `PUT /n8n` (Zeile 60) und `GET /n8n` (Zeile 47) registriert.
- Express nimmt den **ersten** passenden Treffer: `PUT /api/settings/n8n` landet in `/:key` mit key = "n8n".
  - Nicht-Admin: `requireRole('admin')` → **403 „Keine Berechtigung"**
  - Admin: Handler trifft `if (['n8n','deputies','resources'].includes(req.params.key)) return;` → **keine Antwort gesendet, Request hängt ewig**
- Die echte `/n8n`-Route wird nie erreicht. Gleiches beim **Laden** (`GET /:key` verschluckt `GET /n8n`) → Einstellungen wirken „zurückgesetzt".
- Betroffen: `GET /n8n`, `PUT /n8n`, `PUT /deputies` (alle einsegmentigen Pfade, die mit `/:key` kollidieren).
- Schema ist OK: Tabelle `n8n_settings` existiert in `server/schema.sql`.

**Zweitursache – Frontend Auto-Save** in `src/components/N8nWebhookSettings.tsx`:
- Kein Speichern-Button; `onChange` des URL-Inputs feuert auf **jeden Tastenanschlag** einen `api.put` → Dutzende Requests mit unvollständigen URLs, kein klares Feedback.

## Änderungen

### 1. `server/src/routes/settings.ts` – Routen neu ordnen
- Alle **spezifischen** Routen vor die generischen `/:key`-Routen verschieben:
  ```text
  Reihenfolge neu:
    GET  /n8n
    PUT  /n8n
    GET  /deputies/list
    PUT  /deputies
    GET  /resources/by-resource/:name
    GET  /resources/:teamleaderId
    PUT  /resources/:teamleaderId
    ── danach erst generisch ──
    GET  /:key
    PUT  /:key
    DELETE /:key
  ```
- Die Guard-Zeilen `if (['n8n','deputies','resources'].includes(req.params.key)) return;` in `GET /:key` und `PUT /:key` **entfernen** (nach Umordnung überflüssig).
- Logik der einzelnen Routen bleibt unverändert.

### 2. `src/components/N8nWebhookSettings.tsx` – Expliziter Speichern-Button
- `handleUrlChange`: nur noch `setWebhookUrl` + `onSettingsChange` – **kein** `api.put` mehr pro Tastenanschlag.
- `handleEnabledChange`: nur noch `setIsEnabled` + `onSettingsChange` – **kein** sofortiges `api.put`.
- Neue `saveSettings()`-Funktion: ein einziges `api.put('/api/settings/n8n', { webhook_url, is_enabled })` mit `isSaving`-State, Erfolgs-/Fehler-Toast und `n8n-settings-updated`-Event.
- Neuer Button „Einstellungen speichern" unter dem URL-Feld.

### 3. Hinweis zum lokalen Server
Nach dem Pull der Server-Änderung den lokalen Server neu starten (`npm run dev` neu starten bzw. `npm run build && npm start`), damit die neue Route-Reihenfolge greift.

## Was sich nicht ändert
- Datenbank-Schema (`n8n_settings` bleibt wie es ist).
- `SettingsModal.tsx` und der `onSettingsChange`-Flow.
- Der „Webhook testen"-Button.

## Ergebnis
- Speichern funktioniert für normale Benutzer (kein 403 mehr) und Admins (kein Hängen mehr).
- Laden der Einstellungen funktioniert → Werte bleiben nach Tab-Wechsel erhalten.
- Genau ein kontrollierter PUT beim Klick auf „Speichern" statt Auto-Save pro Tastenanschlag.
