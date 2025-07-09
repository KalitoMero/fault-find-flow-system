
# Produktions-Fehlermeldungs-App

Eine professionelle Web-Anwendung zur strukturierten Erfassung und Verwaltung von Produktions-Fehlermeldungen, optimiert für Windows-Touchscreen-Terminals.

## 🎯 Überblick

Diese Anwendung ermöglicht es Mitarbeitern in der Produktion, Fehlermeldungen schnell und strukturiert zu erfassen. Team- und Schichtleiter können diese Meldungen prüfen und freigeben. Das System funktioniert vollständig offline und synchronisiert Daten automatisch bei verfügbarer Netzwerkverbindung.

## ✨ Hauptfunktionen

### Für Mitarbeiter
- **Touch-optimierte Erfassung**: Große Buttons und Eingabefelder für Touchscreen-Bedienung
- **Pflichtfelder-Validierung**: Auftragsnummer, AFO-Nummer, Mengen, Maschine, Beschreibungen
- **Audio-Aufnahme**: Multilingual-Spracherkennung mit automatischer deutscher Transkription
- **Offline-Betrieb**: Vollständige Funktionalität ohne Internetverbindung
- **Fortlaufende Nummerierung**: Automatische, eindeutige Fehlermeldungs-IDs

### Für Team-/Schichtleiter
- **Freigabe-Dashboard**: Übersicht aller zur Prüfung stehenden Meldungen
- **Audio-Wiedergabe**: Anhören der aufgenommenen Sprachnachrichten
- **Genehmigung/Ablehnung**: Mit Kommentarfunktion für Rückweisungen
- **Detailansicht**: Vollständige Meldungsdaten zur Prüfung

### Allgemeine Features
- **Export-Funktionen**: Excel und CSV-Export mit konfigurierbaren Feldern
- **Statistik-Dashboard**: Übersicht über Meldungsstatistiken
- **API-Integration**: REST-Endpoints für BI-Tools
- **Progressive Web App**: Installierbar auf Windows-Terminals

## 🚀 Schnellstart

### Voraussetzungen
- Node.js 18+ 
- npm oder yarn
- Moderner Webbrowser (Chrome, Edge, Firefox)
- Mikrofon für Audio-Aufnahme

### Installation

1. **Repository klonen**
```bash
git clone <repository-url>
cd produktions-fehlermeldungen
```

2. **Abhängigkeiten installieren**
```bash
npm install
```

3. **Entwicklungsserver starten**
```bash
npm run dev
```

4. **Anwendung öffnen**
```
http://localhost:8080
```

### Benutzerrollen testen

- **Mitarbeiter-Ansicht**: `http://localhost:8080?role=employee`
- **Schichtleiter-Ansicht**: `http://localhost:8080?role=supervisor`

## 🏗️ Technische Architektur

### Frontend
- **React 18** mit TypeScript
- **Tailwind CSS** für responsives Design
- **Shadcn/UI** Komponentenbibliothek
- **Lucide React** Icons
- **React Router** für Navigation
- **Service Worker** für Offline-Funktionalität

### Datenspeicherung
- **localStorage** für Offline-Betrieb (Demo)
- **IndexedDB** für große Datenmengen (Erweiterung möglich)
- **Service Worker Cache** für App-Assets

### Audio-Verarbeitung
- **Web Audio API** für Aufnahme
- **MediaRecorder API** für Kompression
- **Simulierte Transkription** (in Produktionsumgebung: Speech-to-Text Service)

## 📱 Touch-Optimierung

### Design-Prinzipien
- **Mindestgröße 44px** für alle interaktiven Elemente
- **Große Buttons** (mindestens 48px Höhe)
- **Ausreichend Abstände** zwischen Elementen
- **Deutliche visuelle Hierarchie**
- **Kontrastreiche Farben** für bessere Lesbarkeit

### Responsive Breakpoints
```css
/* Mobile First */
sm: 640px   /* Tablets im Hochformat */
md: 768px   /* Tablets im Querformat */
lg: 1024px  /* Desktop/Terminals */
xl: 1280px  /* Große Terminals */
```

## 🔧 Konfiguration

### Umgebungsvariablen
```env
# Service Worker
REACT_APP_SW_ENABLED=true

# Audio-Transkription
REACT_APP_SPEECH_SERVICE_URL=https://api.speech-service.com
REACT_APP_SPEECH_API_KEY=your-api-key

# Backend API (optional)
REACT_APP_API_BASE_URL=https://your-backend.com/api
```

### Anpassungen für Produktionsumgebung

1. **Datenspeicherung**: localStorage durch echte Datenbank ersetzen
2. **Authentifizierung**: Benutzeranmeldung implementieren
3. **Speech-to-Text**: Echten Transkriptions-Service integrieren
4. **Netzwerk-Sync**: Backend-API für Datensynchronisation

## 🔒 Offline-Funktionalität

### Service Worker Features
- **App-Shell Caching**: Vollständig offline verfügbar
- **Daten-Synchronisation**: Automatischer Upload bei Verbindung
- **Background Sync**: Zuverlässige Datenübertragung
- **Offline-Queue**: Fehlermeldungen werden lokal zwischengespeichert

### Sync-Strategien
- **Cache-First**: App-Assets und UI-Komponenten
- **Network-First**: API-Calls mit Fallback auf Cache
- **Queue-and-Sync**: POST-Requests für Offline-Betrieb

## 📊 Datenstruktur

### ErrorReport Interface
```typescript
interface ErrorReport {
  id: string;                    // Fortlaufende ID
  orderNumber: string;           // Auftragsnummer
  afoNumber: string;             // AFO-Nummer
  defectiveQuantity: number;     // Beanstandete Menge
  totalDefectiveQuantity: number;// Gesamt beanstandete Menge
  creator: string;               // Ersteller Name
  personalNumber: string;        // Personal-Nummer
  machine: string;               // Maschine
  problemDescription: string;    // Problembeschreibung
  errorCause: string;           // Fehlerursache
  correctiveAction: string;     // Korrekturmaßnahme
  createdAt: string;           // Erstellungsdatum
  approvalStatus: string;      // pending|approved|rejected
  audioFiles?: AudioFiles;     // Audio-Aufnahmen
}
```

## 🔄 Export-Funktionen

### Excel Export
- **Konfigurierbare Felder**: Basis-Info, Mengen, Beschreibungen, etc.
- **UTF-8 BOM**: Korrekte Umlaute in Excel
- **Audio-Referenzen**: Verweise auf vorhandene Aufnahmen

### CSV Export
- **Standard-Format**: Komma-separierte Werte
- **Excel-Kompatibilität**: Deutsche Lokalisierung
- **Escape-Funktionen**: Sichere Datenexporte

### API-Integration
```javascript
// REST API für BI-Tools
GET /api/error-reports?status=approved&format=json
GET /api/error-reports?from=2024-01-01&to=2024-12-31&format=csv
```

## 🎵 Audio-Integration

### Aufnahme-Features
- **Rauschunterdrückung**: Optimiert für laute Produktionsumgebung
- **Kompression**: WebM/Opus Format für kleine Dateien
- **Wiedergabe**: Integrierter Audio-Player
- **Speicher-Management**: Automatische Bereinigung

### Transkription (Produktionsumgebung)
```javascript
// Beispiel-Integration mit Speech-to-Text Service
const transcribeAudio = async (audioBlob) => {
  const formData = new FormData();
  formData.append('audio', audioBlob);
  formData.append('language', 'de-DE');
  
  const response = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData
  });
  
  return response.json();
};
```

## 🎨 UI/UX Design

### Farbschema
- **Primär**: Rot (#dc2626) für Fehlermeldungen
- **Sekundär**: Grau-Töne für neutrale Elemente
- **Erfolg**: Grün (#16a34a) für Bestätigungen
- **Warnung**: Gelb (#eab308) für ausstehende Aktionen

### Typografie
- **Schriftgröße**: Minimum 16px für Touch-Geräte
- **Zeilenhöhe**: 1.5 für bessere Lesbarkeit
- **Schriftart**: System-Fonts für Performance

## 🔧 Wartung und Monitoring

### Logging
- **Console-Ausgaben**: Detaillierte Debug-Informationen
- **Error-Tracking**: Automatische Fehlererfassung
- **Performance-Monitoring**: Service Worker Metriken

### Updates
- **Service Worker**: Automatische App-Updates
- **Cache-Invalidierung**: Versionierte Assets
- **Graceful Degradation**: Fallbacks für ältere Browser

## 📋 Deployment

### Windows-Terminal Setup

1. **Browser-Installation**
```powershell
# Edge oder Chrome installieren
# Kiosk-Modus aktivieren
chrome.exe --kiosk --app=http://localhost:8080
```

2. **Autostart-Konfiguration**
```batch
@echo off
cd C:\path\to\app
npm start
start chrome --kiosk --app=http://localhost:8080
```

3. **Netzwerk-Konfiguration**
- Statische IP-Adresse konfigurieren
- Firewall-Regeln für lokale API
- CORS-Einstellungen für Netzwerk-Zugriff

### Produktions-Deployment

1. **Build erstellen**
```bash
npm run build
```

2. **Webserver konfigurieren**
```nginx
server {
    listen 80;
    server_name production-errors.local;
    root /var/www/production-errors/build;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://localhost:3001;
    }
}
```

## 🤝 Mitwirkende

- Frontend-Entwicklung: React/TypeScript
- UI/UX Design: Tailwind CSS/Shadcn
- Audio-Integration: Web Audio API
- Offline-Funktionalität: Service Worker
- Export-Funktionen: CSV/Excel

## 📄 Lizenz

Dieses Projekt ist für interne Unternehmensnutzung entwickelt.

## 🆘 Support

Bei Fragen oder Problemen:
1. README und Dokumentation prüfen
2. Browser-Konsole auf Fehlermeldungen überprüfen
3. Service Worker Status in DevTools kontrollieren
4. Mikrofon-Berechtigungen verifizieren

---

**Version**: 1.0.0  
**Letztes Update**: 2024-12-XX  
**Entwickelt für**: Windows-Touchscreen-Terminals in Produktionsumgebungen
