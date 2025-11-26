import { ErrorReport } from './storage';
import { getMachines } from './settingsStorage';
import { supabase } from '@/integrations/supabase/client';

const getStatusText = (status: string) => {
  switch (status) {
    case 'approved':
      return 'Freigegeben';
    case 'rejected':
      return 'Abgelehnt';
    default:
      return 'Zur Prüfung';
  }
};

export const printErrorReport = async (report: ErrorReport, onAfterPrint?: () => void) => {
  // Hole den richtigen Feststellort-Namen
  const machines = await getMachines();
  const machine = machines.find(m => m.id === report.machine);
  const machineName = machine ? machine.name : report.machine;

  // Hole die Namen des Freigabenden/Ablehnenden aus der Datenbank
  let approvedByName = report.approvedBy;
  let rejectedByName = report.rejectedBy;

  if (report.approvedBy) {
    const { data: approvedByProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', report.approvedBy)
      .single();
    if (approvedByProfile) {
      approvedByName = approvedByProfile.name;
    }
  }

  if (report.rejectedBy) {
    const { data: rejectedByProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', report.rejectedBy)
      .single();
    if (rejectedByProfile) {
      rejectedByName = rejectedByProfile.name;
    }
  }

  // Build HTML content
  const htmlContent = `
    <style>
      @media print {
        @page {
          margin: 10mm;
          size: A4;
        }

        body {
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Nur den Print-Container anzeigen */
        body > *:not(#print-container) {
          display: none !important;
        }

        #print-container {
          display: block !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
        }

        #print-content {
          margin: 0 auto !important;
          padding: 0 !important;
          min-height: 100vh !important;
          display: flex !important;
          flex-direction: column !important;
        }
      }
      
      #print-content {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 900px;
        margin: 0 auto;
        padding: 20px;
      }
      
      #print-content h1 {
        text-align: center;
        color: #1a237e;
        border-bottom: 3px solid #1a237e;
        padding-bottom: 15px;
        margin-bottom: 10px;
        font-size: 28px;
      }
      
      #print-content .report-number {
        text-align: center;
        font-size: 16px;
        color: #666;
        margin-bottom: 30px;
      }
      
      #print-content .status-card {
        margin-bottom: 25px;
        padding: 20px;
        border-radius: 8px;
        border: 2px solid;
      }
      
      #print-content .status-card.approved {
        background-color: #d4edda;
        border-color: #c3e6cb;
      }
      
      #print-content .status-card.rejected {
        background-color: #f8d7da;
        border-color: #f5c6cb;
      }
      
      #print-content .status-card.pending {
        background-color: #fff3cd;
        border-color: #ffeaa7;
      }
      
      #print-content .status-card h3 {
        margin: 0 0 15px 0;
        font-size: 18px;
      }
      
      #print-content .status-card.approved h3 {
        color: #155724;
      }
      
      #print-content .status-card.rejected h3 {
        color: #721c24;
      }
      
      #print-content .status-card.pending h3 {
        color: #856404;
      }
      
      #print-content .section {
        margin-bottom: 15px;
      }
      
      #print-content .section-title {
        font-weight: bold;
        font-size: 18px;
        color: #1a237e;
        margin-bottom: 15px;
        padding-bottom: 5px;
        border-bottom: 2px solid #ddd;
      }
      
      #print-content .info-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 15px;
        margin-bottom: 15px;
      }
      
      #print-content .info-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      #print-content .info-label {
        font-size: 12px;
        color: #666;
        font-weight: normal;
      }
      
      #print-content .info-value {
        font-weight: 600;
        color: #333;
        font-size: 14px;
      }
      
      #print-content .text-content {
        background-color: #f5f5f5;
        padding: 15px;
        border-radius: 6px;
        margin-top: 10px;
        white-space: pre-wrap;
        line-height: 1.8;
      }
      
      #print-content .additional-data {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-top: 8px;
      }
      
      #print-content .separator {
        border: 0;
        border-top: 1px solid #ddd;
        margin: 15px 0;
      }
      
      #print-content .main-content {
        padding-bottom: 10px;
        flex: 1 0 auto;
      }
      
      #print-content .footer {
        display: flex;
        justify-content: space-between;
        padding: 10px 15px;
        margin-top: 15px;
        font-size: 9px;
        color: #666;
        border-top: 1px solid #ddd;
      }
      
      #print-content .footer-item {
        flex: 1;
        text-align: center;
      }
      
      #print-content .footer-item:first-child {
        text-align: left;
      }
      
      #print-content .footer-item:last-child {
        text-align: right;
      }
      
    </style>
    
    <div id="print-content">
      <div class="main-content">
      <h1>QF14-03 Fehlermeldung</h1>
      
      ${report.approvalStatus === 'approved' && approvedByName && report.approvedAt ? `
        <div class="status-card approved">
          <h3>✓ Freigabe-Information</h3>
          <div class="info-grid" style="grid-template-columns: 1fr 1fr;">
            <div class="info-item">
              <span class="info-label">Freigegeben von:</span>
              <span class="info-value">${approvedByName}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Freigegeben am:</span>
              <span class="info-value">${new Date(report.approvedAt).toLocaleString('de-DE')}</span>
            </div>
          </div>
        </div>
      ` : ''}
      
      ${report.approvalStatus === 'rejected' && rejectedByName && report.rejectedAt ? `
        <div class="status-card rejected">
          <h3>✗ Ablehnungs-Information</h3>
          <div class="info-grid" style="grid-template-columns: 1fr 1fr;">
            <div class="info-item">
              <span class="info-label">Abgelehnt von:</span>
              <span class="info-value">${rejectedByName}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Abgelehnt am:</span>
              <span class="info-value">${new Date(report.rejectedAt).toLocaleString('de-DE')}</span>
            </div>
          </div>
          ${report.rejectionReason ? `
            <div style="margin-top: 15px;">
              <span class="info-label">Ablehnungsgrund:</span>
              <div class="text-content" style="margin-top: 5px;">${report.rejectionReason}</div>
            </div>
          ` : ''}
        </div>
      ` : ''}
      
      ${report.approvalStatus === 'pending' ? `
        <div class="status-card pending">
          <h3>⏳ Status: Zur Prüfung</h3>
        </div>
      ` : ''}
      
      <div class="section">
        <div class="section-title">Grunddaten</div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Ba-Nr.:</span>
            <span class="info-value">${report.orderNumber}</span>
          </div>
          <div class="info-item">
            <span class="info-label">AFO-Nummer:</span>
            <span class="info-value">${report.afoNumber || 'Nicht angegeben'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Ersteller:</span>
            <span class="info-value">${report.creator}</span>
          </div>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Artikelnummer:</span>
            <span class="info-value">${report.additionalExcelData?.Artikelnummer || 'Nicht verfügbar'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Artikelbezeichnung:</span>
            <span class="info-value">${report.additionalExcelData?.Artikelbezeichnung || 'Nicht verfügbar'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Ressource:</span>
            <span class="info-value">${report.resourceName || report.additionalExcelData?.Ressource || machineName || 'Nicht angegeben'}</span>
          </div>
        </div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">${report.quantityType || 'Fehlermenge'}:</span>
            <span class="info-value">${report.defectiveQuantity} (${report.quantityType || 'Ausschussmenge'})</span>
          </div>
          <div class="info-item">
            <span class="info-label">Personalnummer:</span>
            <span class="info-value">${report.personalNumber}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Erstellt am:</span>
            <span class="info-value">${new Date(report.createdAt).toLocaleString('de-DE')}</span>
          </div>
        </div>
      </div>
      
      ${report.additionalExcelData && Object.keys(report.additionalExcelData).filter(key => 
        key !== 'Artikelnummer' && key !== 'Artikelbezeichnung' && key !== 'Ressource'
      ).length > 0 ? `
        <hr class="separator" />
        <div class="section">
          <div class="section-title">Zusätzliche Informationen</div>
          <div class="additional-data">
            ${Object.entries(report.additionalExcelData)
              .filter(([key]) => key !== 'Artikelnummer' && key !== 'Artikelbezeichnung' && key !== 'Ressource')
              .map(([key, value]) => `
                <div class="info-item">
                  <span class="info-label">${key}:</span>
                  <span class="info-value">${value}</span>
                </div>
              `).join('')}
          </div>
        </div>
      ` : ''}
      
      <hr class="separator" />
      
      <div class="section">
        <div class="section-title">Problembeschreibung</div>
        <div class="text-content">${report.problemDescription}</div>
      </div>
      
      <hr class="separator" />
      
      <div class="section">
        <div class="section-title">Korrekturmaßnahme</div>
        <div class="text-content">${report.correctiveAction}</div>
      </div>
      </div>
      
      <div class="footer">
        <div class="footer-item">Ersteller: Karl-Heinz Leuze</div>
        <div class="footer-item">Prüfung/Freigabe: siehe Qwiki</div>
        <div class="footer-item">Revision: 01 vom 04.11.2025</div>
      </div>
    </div>
  `;

  // Create or get print container
  let printContainer = document.getElementById('print-container');
  if (!printContainer) {
    printContainer = document.createElement('div');
    printContainer.id = 'print-container';
    document.body.appendChild(printContainer);
  }

  // Insert HTML content
  printContainer.innerHTML = htmlContent;

  // Trigger print
  window.print();

  // WORKAROUND: Automatisch "Enter" nach 2 Sekunden drücken
  // um den Druckdialog zu bestätigen
  setTimeout(() => {
    // Simuliere Enter-Tastendruck
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(enterEvent);
    
    console.log('Auto-Enter für Druckdialog gesendet');
  }, 2000); // 2 Sekunden warten, dann Enter drücken

  // Cleanup und Navigation nach weiteren 3 Sekunden (insgesamt 5 Sek)
  setTimeout(() => {
    // Cleanup: Print-Container entfernen
    const printContainer = document.getElementById('print-container');
    if (printContainer) {
      printContainer.remove();
    }
    
    // Callback ausführen (Navigation zur Startseite)
    if (onAfterPrint) {
      onAfterPrint();
    }
  }, 5000); // 5 Sekunden Gesamtverzögerung
};
