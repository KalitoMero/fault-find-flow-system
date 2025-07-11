
import { ErrorReport } from './storage';

export const printErrorReport = (report: ErrorReport) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

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
          line-height: 1.6;
          color: #333;
        }
        .header {
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          color: #dc2626;
          margin-bottom: 10px;
        }
        .subtitle {
          color: #6b7280;
          font-size: 14px;
        }
        .status {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 12px;
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
          margin-bottom: 30px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 15px;
          color: #111827;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        .field {
          margin-bottom: 15px;
        }
        .field-label {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 4px;
        }
        .field-value {
          font-weight: 500;
          color: #111827;
        }
        .description-box {
          background-color: #f9fafb;
          padding: 15px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        .approval-info {
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
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
          margin-bottom: 10px;
        }
        .approval-title.approved {
          color: #166534;
        }
        .approval-title.rejected {
          color: #dc2626;
        }
        @media print {
          body {
            margin: 0;
            padding: 15px;
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

      ${report.approvalStatus === 'approved' && report.approvedBy && report.approvedAt ? `
        <div class="approval-info approved">
          <div class="approval-title approved">Freigabe-Information</div>
          <div class="grid">
            <div class="field">
              <div class="field-label">Freigegeben von:</div>
              <div class="field-value">${report.approvedBy}</div>
            </div>
            <div class="field">
              <div class="field-label">Freigegeben am:</div>
              <div class="field-value">${formatDate(report.approvedAt)}</div>
            </div>
          </div>
        </div>
      ` : ''}

      ${report.approvalStatus === 'rejected' && report.rejectedBy && report.rejectedAt ? `
        <div class="approval-info rejected">
          <div class="approval-title rejected">Ablehnungs-Information</div>
          <div class="grid">
            <div class="field">
              <div class="field-label">Abgelehnt von:</div>
              <div class="field-value">${report.rejectedBy}</div>
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
        <div class="grid">
          <div class="field">
            <div class="field-label">Auftragsnummer:</div>
            <div class="field-value">${report.orderNumber}</div>
          </div>
          <div class="field">
            <div class="field-label">AFO-Nummer:</div>
            <div class="field-value">${report.afoNumber || '-'}</div>
          </div>
          <div class="field">
            <div class="field-label">Maschine:</div>
            <div class="field-value">${report.machine || '-'}</div>
          </div>
          <div class="field">
            <div class="field-label">Beanstandete Menge:</div>
            <div class="field-value">${report.defectiveQuantity}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Problembeschreibung</div>
        <div class="description-box">
          ${report.problemDescription}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Korrekturmaßnahme</div>
        <div class="description-box">
          ${report.correctiveAction}
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};
