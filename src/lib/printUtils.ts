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
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        h1 {
          text-align: center;
          color: #1a237e;
          border-bottom: 2px solid #1a237e;
          padding-bottom: 10px;
          margin-bottom: 30px;
        }
        
        .report-number {
          text-align: center;
          font-size: 14px;
          color: #666;
          margin-bottom: 30px;
        }
        
        .section {
          margin-bottom: 25px;
          page-break-inside: avoid;
        }
        
        .section-title {
          font-weight: bold;
          font-size: 16px;
          color: #1a237e;
          margin-bottom: 10px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        
        .info-row {
          display: flex;
          margin-bottom: 8px;
        }
        
        .info-label {
          font-weight: bold;
          min-width: 180px;
        }
        
        .info-value {
          flex: 1;
        }
        
        .text-content {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 4px;
          margin-top: 10px;
          white-space: pre-wrap;
        }
        
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 4px;
          font-weight: bold;
        }
        
        .status-pending {
          background-color: #fff3cd;
          color: #856404;
        }
        
        .status-approved {
          background-color: #d4edda;
          color: #155724;
        }
        
        .status-rejected {
          background-color: #f8d7da;
          color: #721c24;
        }
        
        .additional-data {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 10px;
        }
        
        @media screen {
          .print-button {
            background-color: #1a237e;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            display: block;
            margin: 20px auto;
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
      <div class="report-number">Meldungsnummer: ${report.id}</div>
      
      <div class="section">
        <div class="section-title">Grundinformationen</div>
        <div class="info-row">
          <span class="info-label">Auftragsnummer:</span>
          <span class="info-value">${report.orderNumber}</span>
        </div>
        <div class="info-row">
          <span class="info-label">AFO-Nummer:</span>
          <span class="info-value">${report.afoNumber || 'Nicht angegeben'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Feststellort:</span>
          <span class="info-value">${machineName || 'Nicht angegeben'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Fehlerhafte Menge:</span>
          <span class="info-value">${report.defectiveQuantity} (${report.quantityType || 'Ausschussmenge'})</span>
        </div>
        <div class="info-row">
          <span class="info-label">Ersteller:</span>
          <span class="info-value">${report.creator}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Personalnummer:</span>
          <span class="info-value">${report.personalNumber}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Erstellt am:</span>
          <span class="info-value">${new Date(report.createdAt).toLocaleString('de-DE')}</span>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Problembeschreibung</div>
        <div class="text-content">${report.problemDescription}</div>
      </div>
      
      <div class="section">
        <div class="section-title">Fehlerursache</div>
        <div class="text-content">${report.errorCause}</div>
      </div>
      
      <div class="section">
        <div class="section-title">Korrekturmaßnahme</div>
        <div class="text-content">${report.correctiveAction}</div>
      </div>
      
      <div class="section">
        <div class="section-title">Freigabestatus</div>
        <span class="status-badge status-${report.approvalStatus}">
          ${getStatusText(report.approvalStatus)}
        </span>
        
        ${report.approvalStatus === 'approved' && approvedByName ? `
          <div class="info-row" style="margin-top: 15px;">
            <span class="info-label">Freigegeben von:</span>
            <span class="info-value">${approvedByName}</span>
          </div>
          ${report.approvedAt ? `
            <div class="info-row">
              <span class="info-label">Freigegeben am:</span>
              <span class="info-value">${new Date(report.approvedAt).toLocaleString('de-DE')}</span>
            </div>
          ` : ''}
        ` : ''}
        
        ${report.approvalStatus === 'rejected' ? `
          ${rejectedByName ? `
            <div class="info-row" style="margin-top: 15px;">
              <span class="info-label">Abgelehnt von:</span>
              <span class="info-value">${rejectedByName}</span>
            </div>
          ` : ''}
          ${report.rejectedAt ? `
            <div class="info-row">
              <span class="info-label">Abgelehnt am:</span>
              <span class="info-value">${new Date(report.rejectedAt).toLocaleString('de-DE')}</span>
            </div>
          ` : ''}
          ${report.rejectionReason ? `
            <div style="margin-top: 10px;">
              <strong>Ablehnungsgrund:</strong>
              <div class="text-content">${report.rejectionReason}</div>
            </div>
          ` : ''}
        ` : ''}
      </div>
      
      ${report.additionalExcelData && Object.keys(report.additionalExcelData).length > 0 ? `
        <div class="section">
          <div class="section-title">Zusätzliche Informationen</div>
          <div class="additional-data">
            ${Object.entries(report.additionalExcelData)
              .map(([key, value]) => `
                <div class="info-row">
                  <span class="info-label">${key}:</span>
                  <span class="info-value">${value}</span>
                </div>
              `).join('')}
          </div>
        </div>
      ` : ''}
      
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
