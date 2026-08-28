# Fix: Admin-Dashboard zeigt bei allen Teamleitern 0

## Ursache (verifiziert)

`getTeamLeaderStatistics()` (`src/lib/storage.ts:212-231`) ruft pro Teamleiter `getErrorReportsForTeamLeader(leader.id)` auf. Diese Funktion (`storage.ts:173-176`) **ignoriert die ID** und ruft `GET /api/error-reports/for-teamleader` auf. Der Server-Handler (`server/src/routes/errorReports.ts:43-105`) filtert ausschließlich nach `req.userId`, also nach dem eingeloggten Nutzer. Beim Teamleiter stimmt das zufällig — beim Admin liefert es 0, und zwar für jede Zeile.

Lösung: ein Server-Endpunkt, der die Zahlen pro Teamleiter aggregiert.

## 1. Backend — `server/src/routes/errorReports.ts`

Diesen Block **direkt vor** `// GET /api/error-reports/:id` einfügen (also vor Zeile 122, nach dem `next-id`-Handler):

```ts
// GET /api/error-reports/statistics/teamleaders
router.get('/statistics/teamleaders', authenticate, requireRole('admin', 'management'), async (_req: AuthRequest, res: Response) => {
  try {
    const { rows } = await query(`
      SELECT
        tl.id,
        tl.name,
        COALESCE(d.name, 'Unbekannte Abteilung') AS department,
        COUNT(er.id)                                                        AS total,
        COUNT(er.id) FILTER (WHERE er.approval_status = 'pending')          AS pending,
        COUNT(er.id) FILTER (WHERE er.approval_status = 'approved')         AS approved,
        COUNT(er.id) FILTER (WHERE er.approval_status = 'rejected')         AS rejected
      FROM profiles tl
      JOIN user_roles ur ON ur.user_id = tl.id AND ur.role = 'teamleader'
      LEFT JOIN departments d ON d.id = tl.department_id
      LEFT JOIN error_reports er ON (
        er.assigned_team_leader_id = tl.id
        OR (tl.department_id IS NOT NULL AND er.department_id = tl.department_id)
        OR er.resource_name IN (
          SELECT tr.resource_name FROM teamleader_resources tr WHERE tr.teamleader_id = tl.id
        )
      )
      GROUP BY tl.id, tl.name, d.name
      ORDER BY tl.name
    `);

    res.json(rows.map(r => ({
      id: r.id,
      name: r.name,
      department: r.department,
      totalReports: Number(r.total),
      pendingReports: Number(r.pending),
      approvedReports: Number(r.approved),
      rejectedReports: Number(r.rejected),
    })));
  } catch (error: any) {
    console.error('Error fetching teamleader statistics:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Teamleiter-Statistiken' });
  }
});
```

Wichtig: Der Block muss **vor** `router.get('/:id', ...)` stehen, sonst wird er nie erreicht.

## 2. Frontend — `src/lib/storage.ts`

Die komplette Funktion `getTeamLeaderStatistics` (Zeilen 212-231) durch diese ersetzen:

```ts
export const getTeamLeaderStatistics = async () => {
  const data = await api.get('/api/error-reports/statistics/teamleaders');
  return (data || []).map((s: any) => ({
    id: s.id,
    username: s.id,
    name: s.name,
    department: s.department || 'Unbekannte Abteilung',
    totalReports: Number(s.totalReports) || 0,
    pendingReports: Number(s.pendingReports) || 0,
    approvedReports: Number(s.approvedReports) || 0,
    rejectedReports: Number(s.rejectedReports) || 0,
  }));
};
```

`src/components/AdminDashboard.tsx` und `src/components/TeamLeaderStatistics.tsx` bleiben unverändert, da die Feldnamen identisch sind.

## 3. Aktivieren

```bash
# im server/-Verzeichnis
npm run build && sudo systemctl restart fehlermeldesystem   # bzw. Prozess neu starten

# im Projekt-Root
npm run build   # dist/ nach /var/www/... kopieren
```
