# Fix: Passwort ändern schlägt fehl

## Ursache (verifiziert)

`src/components/AccountManagementDialog.tsx:98` ruft beim Speichern eines neuen Passworts auf:

```ts
await api.put(`/api/profiles/${employee.id}/password`, { password: newPassword });
```

In `server/src/routes/profiles.ts` gibt es aber nur diese Routen:
`GET /`, `GET /:id`, `GET /by-department/:departmentId`, `PUT /:id`, `DELETE /:id`.

Eine Route `PUT /:id/password` existiert nicht — der Server antwortet mit 404, der Client wirft die Fehlermeldung "Fehler beim Aktualisieren: ...". Der einzige vorhandene Passwort-Endpunkt ist `POST /api/auth/change-password` (`server/src/routes/auth.ts:186`), der aber nur das **eigene** Passwort (`req.userId`) ändert und deshalb für den Admin-Dialog nicht passt.

## Lösung

### 1. `server/src/routes/profiles.ts` — Admin-Route zum Passwort-Reset ergänzen

Ganz oben `bcrypt` importieren:

```ts
import bcrypt from 'bcryptjs';
```

Und **vor** `router.put('/:id', ...)` (also vor Zeile 57) einfügen:

```ts
// PUT /api/profiles/:id/password  (nur Admin)
router.put('/:id/password', authenticate, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body;
    if (!password || String(password).length < 4) {
      return res.status(400).json({ error: 'Passwort muss mindestens 4 Zeichen lang sein' });
    }

    const exists = await query('SELECT id FROM users WHERE id = $1', [req.params.id]);
    if (exists.rows.length === 0) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden' });
    }

    const hash = await bcrypt.hash(String(password), 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.params.id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Fehler beim Ändern des Passworts' });
  }
});
```

Wichtig: Die Route muss **vor** `PUT /:id` stehen, sonst greift die generische Route zuerst.

Sicherstellen, dass `requireRole` im Import-Statement der Datei enthalten ist (wird bereits von `DELETE /:id` genutzt).

### 2. Fehlermeldung im Dialog aussagekräftiger machen (optional)

In `src/components/AccountManagementDialog.tsx:108`:

```ts
toast.error('Fehler beim Aktualisieren: ' + (error?.message || 'Unbekannter Fehler'));
```

## Aktivieren

Backend neu bauen und neu starten. Frontend-Build ist nur nötig, wenn Punkt 2 übernommen wird.
