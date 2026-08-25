# N8N-Einstellungen: Expliziter Speichern-Button statt Auto-Save

## Problem
In `src/components/N8nWebhookSettings.tsx` gibt es keinen „Speichern"-Button. Stattdessen speichert der Code **bei jeder Eingabe automatisch**:
- `onChange` des URL-Inputs (Zeile 147) feuert auf **jeden Tastenanschlag** und ruft `handleUrlChange` → `api.put('/api/settings/n8n')` auf.
- Der Switch feuert `handleEnabledChange` → ebenfalls sofort `api.put`.

Folgen:
- Bei jedem Buchstaben wird eine unvollständige URL ans Backend geschickt.
- Wenn der PUT fehlschlägt (z.B. Backend-Route-Reihenfolge-Bug, s. `server/src/routes/settings.ts`), bleibt die Änderung nur im lokalen State — beim Verlassen des Tabs lädt `useEffect` neu und überschreibt sie wieder mit dem alten Backend-Wert → „Einstellungen werden zurückgesetzt".
- Kein sichtbares Feedback, dass gespeichert wurde (nur ein Toast im Fehlerfall).

## Lösung
Eingaben erst lokal halten und **erst beim Klick auf „Speichern"** ans Backend senden.

### Änderung in `src/components/N8nWebhookSettings.tsx`

1. **Lokaler State bleibt, Auto-Save entfernen**
   - `handleUrlChange` (Zeile 41–57): nur noch `setWebhookUrl(value)` + `onSettingsChange(...)`, **kein** `api.put`.
   - `handleEnabledChange` (Zeile 59–81): nur noch `setIsEnabled(enabled)` + `onSettingsChange(...)`, **kein** `api.put` und keine Erfolgs-Toast. Stattdessen ggf. Hinweis, dass gespeichert werden muss.

2. **Neue `saveSettings`-Funktion**
   ```tsx
   const [isSaving, setIsSaving] = useState(false);

   const saveSettings = async () => {
     setIsSaving(true);
     try {
       await api.put('/api/settings/n8n', {
         webhook_url: webhookUrl,
         is_enabled: isEnabled,
       });
       window.dispatchEvent(new CustomEvent('n8n-settings-updated'));
       toast.success('N8N-Einstellungen gespeichert');
     } catch (error) {
       console.error('Error saving N8N settings:', error);
       toast.error('Fehler beim Speichern der Einstellungen');
     } finally {
       setIsSaving(false);
     }
   };
   ```

3. **Speichern-Button einfügen** (unter dem URL-Feld, vor dem Test-Button):
   ```tsx
   <Button onClick={saveSettings} disabled={isSaving} className="w-full">
     <Settings className="h-4 w-4 mr-2" />
     {isSaving ? 'Speichert...' : 'Einstellungen speichern'}
   </Button>
   ```

4. **`onSettingsChange` aus der `useEffect`-Dependency entfernen** (stabilisieren), damit das Neuladen beim Verlassen/Wechseln des Tabs nicht versehentlich den lokalen State überschreibt, bevor gespeichert wurde. Entweder `useCallback` im Eltern-Element (`SettingsModal.tsx`) oder `onSettingsChange`-Ref verwenden. Parent `handleN8nSettingsChange` (SettingsModal Zeile 333) ist bereits stabil genug, aber da es nicht memoisiert ist, лучше per `useRef` sichern.

## Was sich nicht ändert
- Backend `server/src/routes/settings.ts` — du hast die Route-Reihenfolge lokal bereits angepasst; in dieser Projekt-Datei bleibt sie unverändert (du pflegst den lokalen Server selbst).
- `onSettingsChange`-Prop und Parent-State-Flow in `SettingsModal.tsx` bleiben bestehen.
- Der „Webhook testen"-Button bleibt wie er ist.

## Technischer Hinweis
Der PUT geht an den lokalen Express-Server (`VITE_API_URL=http://localhost:3001`). In der Lovable-Preview läuft dieser Server nicht, deshalb schlägt das Speichern dort fehl — das ist erwartet. Lokal (wo dein Server läuft) funktioniert es nach dieser Änderung zuverlässig, weil nicht mehr bei jedem Tastenanschlag gespeichert wird und ein sichtbarer Speichern-Button das Speichern steuert.
