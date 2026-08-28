# Fix: Dashboard-Statistiken zeigen immer 0

## Ursache (verifiziert)

`getTeamLeaderStatistics()` in `src/lib/storage.ts:212-231` lädt alle Teamleiter und ruft pro Teamleiter `getErrorReportsForTeamLeader(leader.id)` auf. Diese Funktion (`storage.ts:173-176`) **ignoriert die übergebene ID** und ruft einfach `GET /api/error-reports/for-teamleader` auf.

Der Server-Handler (`server/src/routes/errorReports.ts:43-105`) filtert ausschließlich nach `req.userId`, also nach dem **eingeloggten Benutzer** — nicht nach dem Teamleiter aus der Liste:
- Ressourcen: `WHERE teamleader_id = req.userId`
- Abteilung: `profiles.department_id` des eingeloggten Users
- `er.assigned_team_leader_id = req.userId`

Wenn ein Admin das Dashboard öffnet, hat dieser in der Regel keine Ressourcen, keine passende Abteilung und keine zugewiesenen Meldungen → das Ergebnis ist eine leere Liste, und zwar für **jede** Zeile der Statistik. Deshalb stehen überall Nullen.

## Lösung

### Backend — neuer Endpunkt

In `server/src/routes/errorReports.ts` einen Endpunkt `GET /statistics/teamleaders` ergänzen (vor `/:id` einsortieren, damit er erreichbar bleibt), abgesichert mit `requireRole('admin', 'management')`. Er liefert in einer einzigen SQL-Abfrage pro Teamleiter die Zählwerte:

- Basis: alle Profile, die in `user_roles` die Rolle `teamleader` haben, `LEFT JOIN departments` für den Abteilungsnamen.
- Zuordnung der Meldungen mit derselben Logik wie `/for-teamleader`, aber pro Teamleiter statt für `req.userId`: `assigned_team_leader_id = tl.id` ODER `resource_name` in dessen `teamleader_resources` ODER `department_id = tl.department_id`.
- Aggregation via `COUNT(*)` und `COUNT(*) FILTER (WHERE approval_status = ...)` für `total`, `pending`, `approved`, `rejected`.
- Da `COUNT(...)` in Postgres `bigint` liefert, im Handler in Zahlen casten (oder im Frontend `Number(...)`), sonst kommen Strings an.

### Frontend

`getTeamLeaderStatistics()` in `src/lib/storage.ts` auf den neuen Endpunkt umstellen: ein einziger `api.get('/api/error-reports/statistics/teamleaders')` und Mapping auf `{ id, name, department, totalReports, pendingReports, approvedReports, rejectedReports }` mit `Number()`-Konvertierung. Die N+1-Schleife über `getProfiles()` entfällt damit.

`getErrorReportsForTeamLeader(_userId)` bleibt unverändert für den Teamleiter-eigenen Blick, bekommt aber einen Kommentar, dass der Parameter ignoriert wird und immer der eingeloggte Nutzer gilt — damit der Fehler nicht erneut entsteht.

Konsumenten (`src/components/TeamLeaderStatistics.tsx`, `src/components/AdminDashboard.tsx`) müssen nicht angepasst werden, da die Feldnamen gleich bleiben.

## Nach der Umsetzung

Backend neu starten und Frontend neu bauen (`npm run build`), damit beide Änderungen auf dem Ubuntu-Server wirksam werden.

## Offene Frage

Falls die Zahlen für einen eingeloggten **Teamleiter** (nicht Admin) ebenfalls 0 sind, liegt zusätzlich das bekannte Rollenproblem vor (`roles[0]` in `src/hooks/useAuth.tsx:57`) — das ist im separaten Audit-Plan beschrieben und kann im selben Zug mitgefixt werden.
