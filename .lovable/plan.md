# Code-Audit: gefundene Fehler und Korrekturplan

Ergebnis der Durchsuchung von Frontend (`src/`) und Backend (`server/src/`). Die SQL-Abfragen sind durchgehend parametrisiert (keine SQL-Injection gefunden), der JWT-Auth-Fluss ist korrekt. Es gibt jedoch mehrere echte Defekte.

## Kritisch

1. **Hängende Requests in den Settings-Routen** (`server/src/routes/settings.ts:8-21`)
   Die generische Route `/:key` steht vor `/n8n`. Bei `n8n`, `deputies`, `resources` wird `return;` ausgeführt — ohne Antwort und ohne `next()`. Der Request bleibt offen, die eigentlichen N8N-/Deputy-Handler werden nie erreicht. Das ist die Ursache dafür, dass N8N-Einstellungen nicht gespeichert werden können.
   Fix: spezifische Routen (`/n8n`, `/deputies/*`, `/resources/*`) vor `/:key` verschieben und die `return;`-Guards entfernen.

2. **Ungeschützter Datei-Download mit Path-Traversal** (`server/src/routes/upload.ts:64-68`)
   `GET /files/:filename` hat als einzige Route der Datei kein `authenticate` und fügt den Dateinamen ungeprüft per `path.join` an. Fix: `authenticate` ergänzen und den Dateinamen auf `path.basename()` reduzieren bzw. prüfen, dass der aufgelöste Pfad innerhalb von `uploadDir` liegt.

## Hoch

3. **Rollenauswahl ist zufällig** (`src/hooks/useAuth.tsx:57` und `:99`)
   `roles[0]` ohne Sortierung; die SQL-Abfrage in `server/src/routes/auth.ts:91` hat kein `ORDER BY`. Bei Nutzern mit mehreren Rollen (z. B. `employee` + `teamleader`) fehlt daher der Dashboard-Button.
   Fix: `resolveRole()` mit Priorität `admin > management > teamleader > employee` einführen und an beiden Stellen nutzen.

4. **Ressourcen-Leck in den Audio-Recordern** (`src/components/AudioRecorder.tsx`, `AudioRecorderSimple.tsx`, `AudioRecorderN8n.tsx`)
   Kein Cleanup beim Unmount: `setInterval`-Timer laufen weiter und das Mikrofon-`MediaStream` wird nicht gestoppt, wenn die Komponente während einer Aufnahme verschwindet.
   Fix: `useEffect(() => () => { Timer clearen, Tracks stoppen, Recorder stoppen, Worker terminieren }, [])` in allen drei Komponenten.

5. **Worker-Cleanup läuft ins Leere** (`src/components/AudioRecorder.tsx:409-412`)
   `postMessage({type:'cleanup'})` direkt gefolgt von `terminate()` — die Nachricht wird nie verarbeitet.
   Fix: entweder auf die Cleanup-Antwort warten oder direkt terminieren und den toten `cleanup`-Zweig entfernen.

## Mittel

6. **Toter Code**: `src/integrations/supabase/client.ts` exportiert `null as any` und wird nirgends importiert; `src/workers/transcriptionWorker.ts` ist durch `optimizedTranscriptionWorker.ts` ersetzt und hat keine Call-Sites. Beide entfernen (nach einem letzten Grep für Typ-Importe aus `integrations/supabase/types`).

7. **Fehlende Eingabevalidierung** (`server/src/routes/excel.ts:23-24`)
   `orderNumber.replace(...)` ohne Prüfung — fehlende Felder erzeugen einen TypeError und einen 500 statt eines 400. Fix: Felder validieren und mit 400 antworten.

8. **Fragile Routen-Reihenfolge** in `server/src/routes/errorReports.ts` (`/:id` vor `/statistics/overview`). Aktuell funktionsfähig, sollte aber vorsorglich umsortiert werden; der irreführende Kommentar bei Zeile 273 wird korrigiert.

## Vorgehen

Umsetzung in dieser Reihenfolge: 1 → 3 → 2 → 4/5 → 6 → 7 → 8. Punkte 1, 2, 7, 8 betreffen nur den Express-Server (Neustart nötig), Punkte 3–6 das Frontend (`npm run build` nötig).
