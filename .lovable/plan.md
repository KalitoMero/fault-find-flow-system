# Teamleiter: Fehlender Dashboard-Button nach Login

## Ursache
`src/hooks/useAuth.tsx` übernimmt nur die erste Rolle (`roles[0]`). Ein Teamleiter hat aber zwei Rollen (`employee` + `teamleader`), und die DB-Reihenfolge ist undefiniert. Kommt `employee` zuerst, ist `profile.role === 'employee'` → kein Dashboard-Button (Index.tsx Zeile 407 prüft auf `teamleader`).

## Exakte Änderung — Datei: `src/hooks/useAuth.tsx`

### 1) Neue Hilfsfunktion einfügen
**Wo:** direkt nach dem `AuthContext` (Zeile 29), vor `AuthProvider`.

```ts
const ROLE_PRIORITY = ['admin', 'management', 'teamleader', 'employee'] as const;

const resolveRole = (roles: string[]): UserProfile['role'] => {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) return role;
  }
  return 'employee';
};
```

### 2) In `loadCurrentUser` (Zeile 57)
**Alt:**
```ts
        role: (roles[0] || 'employee') as any,
```
**Neu:**
```ts
        role: resolveRole(roles),
```

### 3) In `login` (Zeile 99)
**Alt:**
```ts
        role: (data.user.roles?.[0] || 'employee') as any,
```
**Neu:**
```ts
        role: resolveRole(data.user.roles || []),
```

## Ergebnis
Teamleiter bekommen zuverlässig `profile.role === 'teamleader'` → Dashboard-Button erscheint, Dashboard öffnet sich automatisch (Index.tsx Zeile 66–72), und ihre Meldungen werden geladen.

Keine anderen Dateien müssen geändert werden. Keine Datenbank-Änderung.
