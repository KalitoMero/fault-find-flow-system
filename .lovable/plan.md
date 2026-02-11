

# Schritt 3: Supabase-Integration komplett entfernen

## Uebersicht

Es gibt noch **7 Dateien** im Frontend, die direkt den Supabase-Client verwenden, plus die gesamte Supabase-Infrastruktur (Edge Functions, Client, Types). Diese muessen alle auf den neuen Express-API-Server umgestellt bzw. geloescht werden.

## Was wird geloescht

| Datei/Ordner | Beschreibung |
|---|---|
| `src/integrations/supabase/client.ts` | Supabase SDK Client |
| `src/integrations/supabase/types.ts` | Auto-generierte Typen |
| `supabase/functions/login-with-credential/` | Edge Function |
| `supabase/functions/create-management-account/` | Edge Function |
| `supabase/functions/manage-employees/` | Edge Function |
| `supabase/config.toml` | Supabase Konfiguration |

## Was wird umgestellt (5 Dateien mit aktiven Supabase-Aufrufen)

### 1. `src/components/ExportSection.tsx`
- Nutzt `supabase.from('profiles')` und `supabase.from('departments')` zum Laden von Namen
- **Loesung**: Ersetze durch `api.get('/api/profiles')` und `api.get('/api/departments')`

### 2. `src/components/ErrorReportDetail.tsx`
- Nutzt `supabase.from('profiles')` um Freigeber-/Ablehnungs-Namen zu laden
- **Loesung**: Ersetze durch `api.get('/api/profiles/:id')`

### 3. `src/components/ErrorReportEdit.tsx`
- Gleicher Fall wie ErrorReportDetail - laedt Profil-Namen via Supabase
- **Loesung**: Ersetze durch `api.get('/api/profiles/:id')`

### 4. `src/components/AccountCreationForm.tsx`
- Nutzt `supabase.from('profiles')` zur Username-Pruefung und `supabase.auth.admin.createUser()` zur Benutzererstellung
- **Loesung**: Ersetze durch API-Aufrufe (`api.post('/api/auth/register')`, `api.get('/api/profiles')`)

### 5. `src/lib/printUtils.ts`
- Nutzt `supabase.from('profiles')` um Freigeber-Namen fuer den Druck zu laden
- **Loesung**: Ersetze durch `api.get('/api/profiles/:id')`

## Aufraeum-Arbeiten

- Entferne `@supabase/supabase-js` aus `package.json`
- Entferne `VITE_SUPABASE_*` Variablen aus `.env`
- Entferne Kommentare die noch "Supabase" referenzieren (z.B. in `useAuth.tsx`, `apiClient.ts`, `N8nWebhookSettings.tsx`)
- Loesche den gesamten `src/integrations/supabase/` Ordner
- Loesche den gesamten `supabase/functions/` Ordner und `supabase/config.toml`

## Technische Details

### Neuer API-Endpunkt benoetigt
Ein `GET /api/profiles/:id` Endpunkt wird im Server ergaenzt, falls noch nicht vorhanden, um einzelne Profile nach ID abzufragen (fuer Freigeber-Namen).

### Reihenfolge der Aenderungen
1. Alle 5 Dateien auf API-Client umstellen
2. Supabase-Dateien und Edge Functions loeschen
3. Package-Dependency und .env bereinigen

