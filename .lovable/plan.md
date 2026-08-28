# Fix: Login mit Benutzername funktioniert nicht

## Ursache (verifiziert)

Es sind zwei zusammenhängende Fehler:

1. **Unterschiedliche E-Mail-Domains.** Beim Anlegen eines Accounts baut `src/components/AccountCreationForm.tsx:71` die Adresse als `${username}@internal.local`. Beim Login baut `src/hooks/useAuth.tsx:88` dagegen `${credential}@app.internal`. Der Login sucht damit eine E-Mail, die es nie gibt → "Ungültige Anmeldedaten".

2. **Der Benutzername wird nie gespeichert.** `POST /api/auth/register` (`server/src/routes/auth.ts:10-61`) liest nur `email, password, name, personalNumber` aus dem Body und schreibt in `profiles` nur `name` und `personal_number`. Das Feld `username`, das das Formular mitschickt (Zeile 79), wird ignoriert; ebenso passt `personal_number` (Formular) nicht zu `personalNumber` (Server). Die Spalte `profiles.username` bleibt also leer, weshalb auch eine spätere Suche nach Benutzernamen nichts findet.

Personalnummer und E-Mail funktionieren, weil diese beiden Pfade keine konstruierte Adresse brauchen.

## Lösung: Benutzername serverseitig als echtes Login-Kriterium

### 1. `server/src/routes/auth.ts` — Register speichert den Benutzernamen

In `POST /register` den Body um `username` erweitern und beide Schreibweisen der Personalnummer akzeptieren:

```ts
const { email, password, name, username } = req.body;
const personalNumber = req.body.personalNumber ?? req.body.personal_number;
```

Und das Profil-INSERT auf `username` erweitern:

```ts
await query(
  'INSERT INTO profiles (id, name, personal_number, username) VALUES ($1, $2, $3, $4)',
  [userId, name, personalNumber || null, (username || email.split('@')[0]).toLowerCase()]
);
```

### 2. `server/src/routes/auth.ts` — Login akzeptiert Benutzername oder E-Mail

In `POST /login` die User-Suche so ändern, dass sie beides trifft (die Domain spielt dann keine Rolle mehr):

```ts
const userResult = await query(
  `SELECT u.id, u.email, u.password_hash, p.name
   FROM users u JOIN profiles p ON p.id = u.id
   WHERE LOWER(u.email) = LOWER($1)
      OR LOWER(p.username) = LOWER($1)
      OR LOWER(SPLIT_PART(u.email, '@', 1)) = LOWER($1)`,
  [email]
);
```

Der dritte Zweig sorgt dafür, dass auch bereits bestehende Accounts ohne gefüllte `username`-Spalte sofort funktionieren.

### 3. `src/hooks/useAuth.tsx` — keine Fantasie-Domain mehr anhängen

Zeile 88 ersetzen durch:

```ts
data = await api.post('/api/auth/login', { email: credential, password });
```

Der Server entscheidet jetzt, ob es eine E-Mail oder ein Benutzername ist.

### 4. Bestehende Profile nachtragen (einmalig, optional)

```sql
UPDATE profiles p
SET username = LOWER(SPLIT_PART(u.email, '@', 1))
FROM users u
WHERE u.id = p.id AND (p.username IS NULL OR p.username = '');
```

## Aktivieren

Backend neu bauen/neu starten und Frontend neu bauen (`npm run build`).
