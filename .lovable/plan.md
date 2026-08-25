# Teamleiter: Fehlender Dashboard-Button nach Login

## Diagnose (bestätigt durch Code-Reads)

Der Dashboard-Button in `src/pages/Index.tsx` (Zeile 407) wird nur angezeigt, wenn `profile.role` `teamleader`, `admin` oder `management` ist.

Das Problem liegt in der Rollen-Auflösung in `src/hooks/useAuth.tsx`:

1. **Jeder User bekommt bei Registrierung die Rolle `employee`** (`server/src/routes/auth.ts` Zeile 41–44).
2. Die Teamleiter-Rolle wird **zusätzlich** vergeben (`src/lib/employeeManagement.ts` Zeile 57, `POST /api/roles`) → ein Teamleiter hat **zwei** Einträge in `user_roles`: `employee` und `teamleader`.
3. Der Login lädt alle Rollen: `SELECT role FROM user_roles WHERE user_id = $1` (`auth.ts` Zeile 91–94) — **ohne ORDER BY**, Reihenfolge undefiniert.
4. `useAuth.tsx` übernimmt nur die **erste** Rolle: `role: (roles[0] || 'employee')` in `loadCurrentUser` (Zeile 57) und in `login` (Zeile 99).
5. Kommt `employee` zuerst zurück, hat der Teamleiter `profile.role === 'employee'` → Dashboard-Button fehlt, Auto-Open des Dashboards (Index.tsx Zeile 66–72) greift nicht, `loadData` lädt keine Teamleiter-Meldungen.

Das erklärt auch, warum es manchmal/zuweilen funktioniert: die Zeilenreihenfolge der DB ist nicht garantiert.

## Änderung: `src/hooks/useAuth.tsx`

Rollen-Priorisierung statt `roles[0]`:

```ts
const ROLE_PRIORITY = ['admin', 'management', 'teamleader', 'employee'] as const;

const resolveRole = (roles: string[]): UserProfile['role'] => {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return role;
  }
  return 'employee';
};
```

Einsetzen an beiden Stellen:
- `loadCurrentUser` (Zeile 57): `role: resolveRole(roles)`
- `login` (Zeile 99): `role: resolveRole(data.user.roles || [])`

Priorität: `admin` > `management` > `teamleader` > `employee`. So bekommt ein User mit mehreren Rollen immer die höchste.

## Optional (empfohlen, klein): `server/src/routes/auth.ts`

In den drei Rollen-Abfragen (`register` hat keine, `login` Zeile 91, `login-with-credential` Zeile 141, `me` via middleware) ein deterministisches `ORDER BY role` ergänzen — als Absicherung, falls später noch Code `roles[0]` nutzt. Rein serverseitig, keine Logikänderung.

## Was sich nicht ändert
- Keine Änderungen an der Datenbank oder an den Rollen selbst.
- Keine UI-Änderungen — der Button erscheint einfach wieder korrekt.
- `src/lib/authz.ts` (`isAdmin` prüft bereits `roles.includes('admin')`) bleibt unverändert.

## Ergebnis
Teamleiter sehen nach dem Login zuverlässig den Dashboard-Button, das Dashboard öffnet sich automatisch, und ihre zugewiesenen Meldungen werden geladen — unabhängig von der Datenbank-Zeilenreihenfolge.
