# N8N-Einstellungen speicherbar machen

Kurz: Nein — auch nicht einmalig. Kein Klick, keine Button-Änderung im Frontend hilft, solange das Backend die Anfrage abfängt. Der Request `PUT /api/settings/n8n` landet immer in der generischen Route `PUT /:key` (`server/src/routes/settings.ts`, Zeile 20), die entweder mit 403 antwortet (Nicht-Admin) oder wegen `if (...) return;` (Zeile 21) gar nicht antwortet. Die echte `/n8n`-Route (Zeile 60) wird nie erreicht. Dasselbe beim Laden über `GET /:key` (Zeile 8).

## Änderung 1 — Backend: Routen-Reihenfolge (`server/src/routes/settings.ts`)

- Die spezifischen Routen nach oben verschieben, vor die generischen:
  `GET /n8n`, `PUT /n8n`, `GET /deputies/list`, `PUT /deputies`, `GET /resources/by-resource/:name`, `GET /resources/:teamleaderId`, `PUT /resources/:teamleaderId`
- Danach erst `GET /:key`, `PUT /:key`, `DELETE /:key`
- Die beiden Guard-Zeilen entfernen (aktuell Zeile 10 und Zeile 21):
  `if (['n8n','deputies','resources'].includes(req.params.key)) return;`
  Sie sind nach der Umsortierung überflüssig und verursachen hängende Requests.

## Änderung 2 — Backend: Upsert statt Select+Insert

In `PUT /n8n` die zwei Abfragen durch ein Upsert ersetzen, damit parallele Speichervorgänge keine Duplikate erzeugen:

```sql
INSERT INTO n8n_settings (user_id, webhook_url, is_enabled)
VALUES ($1, $2, $3)
ON CONFLICT (user_id) DO UPDATE
SET webhook_url = EXCLUDED.webhook_url, is_enabled = EXCLUDED.is_enabled;
```

Voraussetzung: eindeutiger Index auf `user_id` in `server/schema.sql` (`UNIQUE (user_id)`). Falls nicht vorhanden, wird er ergänzt.

## Änderung 3 — Frontend: echter Speichern-Button (`src/components/N8nWebhookSettings.tsx`)

- Auto-Save bei jedem Tastenanschlag entfernen; Eingaben nur noch im lokalen State halten.
- Button „Speichern" unter dem URL-Feld, aktiv nur bei ungespeicherten Änderungen.
- Beim Klick ein `api.put('/api/settings/n8n', ...)`; Erfolg → Toast „Einstellungen gespeichert", Fehler → Toast mit der Fehlermeldung des Servers (statt wie bisher stillem Fehlschlag).
- Hinweistext „Nicht gespeicherte Änderungen", solange etwas offen ist.

## Hinweis zum Testen

Das funktioniert nur gegen deinen lokal laufenden Express-Server mit gesetzter `DATABASE_URL`. In der Lovable-Preview schlagen alle `/api/...`-Aufrufe weiterhin fehl, weil dort `http://localhost:3001` nicht erreichbar ist.
