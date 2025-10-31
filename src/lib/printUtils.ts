import { ErrorReport } from './storage';
import { getMachines, getEmployees } from './settingsStorage';

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

export const printErrorReport = async (report: ErrorReport) => {
  // Hole den richtigen Feststellort-Namen
  const machines = await getMachines();
  const machine = machines.find(m => m.id === report.machine);
  const machineName = machine ? machine.name : report.machine;

  // Hole den Namen des Freigabenden/Ablehnenden
  const employees = await getEmployees();
  const getEmployeeName = (username: string) => {
    const employee = employees.find(emp => emp.account?.username === username);
    return employee ? employee.name : username;
  };

  const approvedByName = report.approvedBy ? getEmployeeName(report.approvedBy) : report.approvedBy;
  const rejectedByName = report.rejectedBy ? getEmployeeName(report.rejectedBy) : report.rejectedBy;

  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Bitte erlauben Sie Pop-ups für diese Seite');
    return;
  }

  // Build HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Fehlermeldung ${report.id}</title>
      <style>
        @media print {
          @page {
            margin: 2cm;
          }
          body {
            margin: 0;
          }
        }
        
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
        }
        
        h1 {
          text-align: center;
          color: #1a237e;
          border-bottom: 3px solid #1a237e;
          padding-bottom: 15px;
          margin-bottom: 10px;
          font-size: 28px;
        }
        
        .report-number {
          text-align: center;
          font-size: 16px;
          color: #666;
          margin-bottom: 30px;
        }
        
        .status-card {
          margin-bottom: 25px;
          padding: 20px;
          border-radius: 8px;
          border: 2px solid;
          page-break-inside: avoid;
        }
        
        .status-card.approved {
          background-color: #d4edda;
          border-color: #c3e6cb;
        }
        
        .status-card.rejected {
          background-color: #f8d7da;
          border-color: #f5c6cb;
        }
        
        .status-card.pending {
          background-color: #fff3cd;
          border-color: #ffeaa7;
        }
        
        .status-card h3 {
          margin: 0 0 15px 0;
          font-size: 18px;
          display: flex;
          align-items: center;
        }
        
        .status-card.approved h3 {
          color: #155724;
        }
        
        .status-card.rejected h3 {
          color: #721c24;
        }
        
        .status-card.pending h3 {
          color: #856404;
        }
        
        .section {
          margin-bottom: 25px;
          page-break-inside: avoid;
        }
        
        .section-title {
          font-weight: bold;
          font-size: 18px;
          color: #1a237e;
          margin-bottom: 15px;
          padding-bottom: 5px;
          border-bottom: 2px solid #ddd;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 15px;
        }
        
        .info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .info-label {
          font-size: 12px;
          color: #666;
          font-weight: normal;
        }
        
        .info-value {
          font-weight: 600;
          color: #333;
          font-size: 14px;
        }
        
        .text-content {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 6px;
          margin-top: 10px;
          white-space: pre-wrap;
          line-height: 1.8;
        }
        
        .status-badge {
          display: inline-block;
          padding: 6px 16px;
          border-radius: 6px;
          font-weight: bold;
          font-size: 14px;
        }
        
        .status-badge.pending {
          background-color: #fff3cd;
          color: #856404;
        }
        
        .status-badge.approved {
          background-color: #d4edda;
          color: #155724;
        }
        
        .status-badge.rejected {
          background-color: #f8d7da;
          color: #721c24;
        }
        
        .additional-data {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin-top: 10px;
        }
        
        .separator {
          border: 0;
          border-top: 1px solid #ddd;
          margin: 20px 0;
        }
        
        @media screen {
          .print-button {
            background-color: #1a237e;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            display: block;
            margin: 20px auto;
            font-weight: 600;
          }
          
          .print-button:hover {
            background-color: #0d1642;
          }
        }
        
        @media print {
          .print-button {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <button class="print-button" onclick="window.print()">Drucken</button>
      
      <h1>Fehlermeldung</h1>
      <div class="report-number">Meldungsnummer: #${report.id}</div>
      
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
            <span class="info-label">Auftragsnummer:</span>
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
            <span class="info-value">${report.additionalExcelData?.Ressource || machineName || 'Nicht angegeben'}</span>
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
        <div class="section-title">Fehlerursache</div>
        <div class="text-content">${report.errorCause}</div>
      </div>
      
      <hr class="separator" />
      
      <div class="section">
        <div class="section-title">Korrekturmaßnahme</div>
        <div class="text-content">${report.correctiveAction}</div>
      </div>
      
      <script>
        // Auto-print after a short delay to ensure content is loaded
        setTimeout(() => {
          // Uncomment the line below to enable auto-print
          // window.print();
        }, 500);
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};
