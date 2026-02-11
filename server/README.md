# Fehlermeldesystem API-Server

Express.js API-Server mit PostgreSQL (ohne Supabase).

## Voraussetzungen

- Node.js >= 18
- PostgreSQL >= 14

## Installation

```bash
cd server
npm install
```

## Datenbank einrichten

1. PostgreSQL-Datenbank erstellen:
```bash
createdb fehlermeldesystem
```

2. Schema importieren:
```bash
psql -d fehlermeldesystem -f schema.sql
```

## Konfiguration

1. `.env` Datei erstellen (siehe `.env.example`):
```bash
cp .env.example .env
```

2. Werte anpassen:
- `DATABASE_URL` - PostgreSQL Connection String
- `JWT_SECRET` - Geheimer Schlüssel für JWT-Tokens (ändern!)
- `PORT` - Server-Port (Standard: 3001)
- `CORS_ORIGIN` - Frontend-URL

## Starten

**Entwicklung:**
```bash
npm run dev
```

**Produktion:**
```bash
npm run build
npm start
```

## Ersten Admin erstellen

1. Benutzer registrieren:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "sicheres-passwort", "name": "Admin"}'
```

2. Admin-Rolle zuweisen (in psql):
```sql
INSERT INTO user_roles (user_id, role) 
SELECT id, 'admin' FROM users WHERE email = 'admin@example.com';
```

## API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| POST | /api/auth/register | Benutzer registrieren |
| POST | /api/auth/login | Anmelden (Email/Passwort) |
| POST | /api/auth/login-with-credential | Anmelden (Personalnummer/Name) |
| GET | /api/auth/me | Eigenes Profil |
| GET | /api/error-reports | Alle Berichte |
| POST | /api/error-reports | Bericht erstellen |
| PUT | /api/error-reports/:id | Bericht aktualisieren |
| PATCH | /api/error-reports/:id/status | Status ändern |
| DELETE | /api/error-reports/:id | Bericht löschen |
| GET | /api/departments | Alle Abteilungen |
| POST | /api/departments | Abteilung erstellen |
| DELETE | /api/departments/:id | Abteilung löschen |
| GET | /api/machines | Alle Maschinen |
| GET | /api/profiles | Alle Profile |
| PUT | /api/profiles/:id | Profil aktualisieren |
| POST | /api/roles | Rolle hinzufügen |
| DELETE | /api/roles | Rolle entfernen |
| POST | /api/upload/audio | Audio hochladen |
| GET | /api/settings/:key | Einstellung lesen |
| PUT | /api/settings/:key | Einstellung speichern |
