import { ErrorReport } from './storage';
import { getEmployees } from './settingsStorage';
import { getMachines } from './settingsStorage';

export const printErrorReport = (report: ErrorReport) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE');
  };

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

  // Hole den richtigen Feststellort-Namen
  const machines = getMachines();
  const machine = machines.find(m => m.id === report.machine);
  const machineName = machine ? machine.name : report.machine;

  // Hole den Namen des Freigabenden/Ablehnenden
  const employees = getEmployees();
  const getEmployeeName = (username: string) => {
    const employee = employees.find(emp => emp.account?.username === username);
    return employee ? employee.name : username;
  };

  const approvedByName = report.approvedBy ? getEmployeeName(report.approvedBy) : report.approvedBy;
  const rejectedByName = report.rejectedBy ? getEmployeeName(report.rejectedBy) : report.rejectedBy;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Fehlermeldung #${report.id}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          line-height: 1.4;
          color: #333;
          font-size: 13px;
        }
        .header {
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .title {
          font-size: 22px;
          font-weight: bold;
          color: #dc2626;
          margin-bottom: 10px;
        }
        .subtitle {
          color: #6b7280;
          font-size: 13px;
        }
        .status {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
          margin-top: 10px;
        }
        .status.approved {
          background-color: #dcfce7;
          color: #166534;
        }
        .status.rejected {
          background-color: #fef2f2;
          color: #dc2626;
        }
        .status.pending {
          background-color: #f3f4f6;
          color: #374151;
        }
        .section {
          margin-bottom: 25px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 12px;
          color: #111827;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        .order-data-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }
        .field {
          margin-bottom: 12px;
        }
        .field-label {
          font-size: 11px;
          color: #6b7280;
          margin-bottom: 3px;
        }
        .field-value {
          font-weight: 500;
          color: #111827;
          font-size: 13px;
        }
        .description-box {
          background-color: #f9fafb;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          page-break-inside: avoid;
          min-height: 60px;
        }
        .approval-info {
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        .approval-info.approved {
          background-color: #f0fdf4;
          border: 1px solid #bbf7d0;
        }
        .approval-info.rejected {
          background-color: #fef2f2;
          border: 1px solid #fecaca;
        }
        .approval-title {
          font-weight: 600;
          margin-bottom: 8px;
          font-size: 14px;
        }
        .approval-title.approved {
          color: #166534;
        }
        .approval-title.rejected {
          color: #dc2626;
        }
        .problem-section {
          page-break-inside: avoid;
        }
        .corrective-section {
          page-break-inside: avoid;
        }
        @media print {
          body {
            margin: 0;
            padding: 15px;
            font-size: 12px;
          }
          .title {
            font-size: 20px;
          }
          .section-title {
            font-size: 15px;
          }
          .field-value {
            font-size: 12px;
          }
          .subtitle {
            font-size: 12px;
          }
          .status {
            font-size: 10px;
          }
          .field-label {
            font-size: 10px;
          }
          .approval-title {
            font-size: 13px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">Fehlermeldung #${report.id}</div>
        <div class="subtitle">Erstellt am ${formatDate(report.createdAt)} von ${report.creator}</div>
        <div class="status ${report.approvalStatus}">Status: ${getStatusText(report.approvalStatus)}</div>
      </div>

      ${report.approvalStatus === 'approved' && approvedByName && report.approvedAt ? `
        <div class="approval-info approved">
          <div class="approval-title approved">Freigabe-Information</div>
          <div class="grid">
            <div class="field">
              <div class="field-label">Freigegeben von:</div>
              <div class="field-value">${approvedByName}</div>
            </div>
            <div class="field">
              <div class="field-label">Freigegeben am:</div>
              <div class="field-value">${formatDate(report.approvedAt)}</div>
            </div>
          </div>
        </div>
      ` : ''}

      ${report.approvalStatus === 'rejected' && rejectedByName && report.rejectedAt ? `
        <div class="approval-info rejected">
          <div class="approval-title rejected">Ablehnungs-Information</div>
          <div class="grid">
            <div class="field">
              <div class="field-label">Abgelehnt von:</div>
              <div class="field-value">${rejectedByName}</div>
            </div>
            <div class="field">
              <div class="field-label">Abgelehnt am:</div>
              <div class="field-value">${formatDate(report.rejectedAt)}</div>
            </div>
          </div>
          ${report.rejectionReason ? `
            <div class="field">
              <div class="field-label">Ablehnungsgrund:</div>
              <div class="field-value">${report.rejectionReason}</div>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <div class="section">
        <div class="section-title">Auftragsdaten</div>
        <div class="order-data-grid">
          <div class="field">
            <div class="field-label">Auftragsnummer:</div>
            <div class="field-value">${report.orderNumber}</div>
          </div>
          <div class="field">
            <div class="field-label">AFO-Nummer:</div>
            <div class="field-value">${report.afoNumber || '-'}</div>
          </div>
          <div class="field">
            <div class="field-label">Abteilung:</div>
            <div class="field-value">${report.excelDepartment || 'Nicht angegeben'}</div>
          </div>
          <div class="field">
            <div class="field-label">Feststellort:</div>
            <div class="field-value">${machineName}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Mengenangaben und Personal</div>
        <div class="order-data-grid">
          <div class="field">
            <div class="field-label">Fehlermenge:</div>
            <div class="field-value">${report.defectiveQuantity}</div>
          </div>
          ${report.personalNumber ? `
            <div class="field">
              <div class="field-label">Personal-Nr:</div>
              <div class="field-value">${report.personalNumber}</div>
            </div>
          ` : ''}
        </div>
        ${report.assignedTeamLeader ? `
          <div class="field">
            <div class="field-label">Zugewiesener Teamleiter:</div>
            <div class="field-value">${report.assignedTeamLeader}</div>
          </div>
        ` : ''}
        ${report.additionalInfo ? `
          <div class="field">
            <div class="field-label">Zusätzliche Information:</div>
            <div class="field-value">${report.additionalInfo}</div>
          </div>
        ` : ''}
      </div>

      ${report.additionalExcelData && Object.keys(report.additionalExcelData).length > 0 ? `
        <div class="section">
          <div class="section-title">Artikel- und Zusatzinformationen</div>
          <div class="order-data-grid">
            ${Object.entries(report.additionalExcelData)
              .map(([key, value]) => `
                <div class="field">
                  <div class="field-label">${key}:</div>
                  <div class="field-value">${value}</div>
                </div>
              `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="section problem-section">
        <div class="section-title">Problembeschreibung</div>
        <div class="description-box">
          ${report.problemDescription}
        </div>
      </div>

      <div class="section corrective-section">
        <div class="section-title">Korrekturmaßnahme</div>
        <div class="description-box">
          ${report.correctiveAction}
        </div>
      </div>
    </body>
    </html>
  `;

  // Erstelle ein verstecktes iframe Element für das Drucken
  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'absolute';
  printFrame.style.top = '-10000px';
  printFrame.style.left = '-10000px';
  printFrame.style.width = '0px';
  printFrame.style.height = '0px';
  printFrame.style.border = 'none';
  
  document.body.appendChild(printFrame);
  
  const printDocument = printFrame.contentDocument || printFrame.contentWindow?.document;
  if (printDocument) {
    printDocument.open();
    printDocument.write(html);
    printDocument.close();
    
    // Warte bis der Inhalt geladen ist und drucke dann
    printFrame.onload = () => {
      // Kurze Verzögerung und dann direkt drucken
      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        
        // Entferne das iframe sofort nach dem Druckaufruf
        setTimeout(() => {
          try {
            document.body.removeChild(printFrame);
          } catch (e) {
            // Frame bereits entfernt
          }
        }, 100);
      }, 100);
    };
  }
};
