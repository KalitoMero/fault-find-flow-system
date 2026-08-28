# Fix: Vertretungsfunktion ist kaputt (nicht entfernt)

## Ursache (verifiziert)

Die Vertretungsfunktion existiert noch vollständig im Code (`src/components/DeputySelection.tsx`, `src/pages/Index.tsx:330-338`, `src/lib/storage.ts:184-191`, `server/src/routes/settings.ts:84-118`). Sie funktioniert nicht, weil sie denselben Routen-Fehler trifft wie die N8N-Einstellungen:

In `server/src/routes/settings.ts` stehen die generischen Routen `GET /:key` (Zeile 8) und `PUT /:key` (Zeile 20) **vor** den spezifischen Routen `/deputies/list`, `/deputies`, `/resources/*` und `/n8n`. Express matcht `/:key` zuerst, und die Guards in Zeile 10 und 21 führen `return;` aus — ohne Antwort und ohne `next()`. Folgen:

- `GET /api/settings/deputies/list` hängt → `isUserDeputy()` fängt den Fehler und liefert `false` → die Vertretungsauswahl wird nie angezeigt (`shouldShow` bleibt `false`).
- `PUT /api/settings/deputies` hängt → Stellvertretung kann nicht gespeichert werden.

Ein Fix behebt Vertretung UND N8N-Einstellungen gleichzeitig.

## Code-Änderung — nur `server/src/routes/settings.ts`

Den kompletten spezifischen Block (N8N + Deputies + Resources) **vor** die generischen `/:key`-Routen verschieben und die Guards entfernen. Konkret:

1. Die Blöcke `// === N8N SETTINGS ===`, `// === DEPUTY ASSIGNMENTS ===` und `// === TEAMLEADER RESOURCES ===` (bisher Zeilen 44-164) direkt nach `const router = Router();` (Zeile 5) einfügen.
2. In `GET /:key` (Zeile 10) und `PUT /:key` (Zeile 21) die Zeilen entfernen:
   ```ts
   if (['n8n', 'deputies', 'resources'].includes(req.params.key)) return;
   ```
   (Wichtig: das `return` ohne `next()` war der eigentliche Bug. Ohne diese Zeilen greifen die Generischen nur noch für echte Setting-Keys.)
3. Alte Positionen der verschobenen Blöcke löschen (keine Duplikate).

## Zusätzlich prüfen (nicht Teil dieses Fixes)

Falls nach dem Fix das Vertretungsfeld bei Teamleitern trotzdem nicht erscheint, liegt das bekannte Rollenproblem vor (`roles[0]` in `src/hooks/useAuth.tsx:57` — Teamleiter mit `employee`+`teamleader` wird zufällig als `employee` erkannt). Das war bereits im Audit-Plan als separates Item beschrieben.

## Aktivieren

Nur Backend-Neustart nötig (`server/`: `npm run build` bzw. Prozess neu starten), kein Frontend-Build erforderlich.
