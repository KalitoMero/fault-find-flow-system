import jsPDF from 'jspdf';
import { ErrorReport } from './storage';
import { getEmployees, getMachines } from './settingsStorage';

export const generatePDF = (report: ErrorReport) => {
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

  const pdf = new jsPDF('p', 'mm', 'a4');
  
  let yPos = 20;
  const pageWidth = 210;
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;

  // Titel
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Fehlermeldung #${report.id}`, marginLeft, yPos);
  yPos += 10;

  // Untertitel
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Erstellt am ${formatDate(report.createdAt)} von ${report.creator}`, marginLeft, yPos);
  yPos += 5;

  // Status
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Status: ${getStatusText(report.approvalStatus)}`, marginLeft, yPos);
  yPos += 15;

  // Freigabe-Information
  if (report.approvalStatus === 'approved' && approvedByName && report.approvedAt) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Freigabe-Information', marginLeft, yPos);
    yPos += 8;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Freigegeben von: ${approvedByName}`, marginLeft, yPos);
    pdf.text(`Freigegeben am: ${formatDate(report.approvedAt)}`, marginLeft + 80, yPos);
    yPos += 15;
  }

  if (report.approvalStatus === 'rejected' && rejectedByName && report.rejectedAt) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Ablehnungs-Information', marginLeft, yPos);
    yPos += 8;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Abgelehnt von: ${rejectedByName}`, marginLeft, yPos);
    pdf.text(`Abgelehnt am: ${formatDate(report.rejectedAt)}`, marginLeft + 80, yPos);
    yPos += 5;

    if (report.rejectionReason) {
      pdf.text(`Ablehnungsgrund: ${report.rejectionReason}`, marginLeft, yPos);
      yPos += 10;
    }
    yPos += 10;
  }

  // Auftragsdaten
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Auftragsdaten', marginLeft, yPos);
  yPos += 8;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  
  // Erste Zeile
  pdf.text(`Auftragsnummer: ${report.orderNumber}`, marginLeft, yPos);
  pdf.text(`AFO-Nummer: ${report.afoNumber || '-'}`, marginLeft + 80, yPos);
  yPos += 5;

  // Zweite Zeile
  pdf.text(`Abteilung: ${report.excelDepartment || 'Nicht angegeben'}`, marginLeft, yPos);
  pdf.text(`Feststellort: ${machineName}`, marginLeft + 80, yPos);
  yPos += 15;

  // Mengenangaben und Personal
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Mengenangaben und Personal', marginLeft, yPos);
  yPos += 8;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Fehlermenge: ${report.defectiveQuantity}`, marginLeft, yPos);
  if (report.personalNumber) {
    pdf.text(`Personal-Nr: ${report.personalNumber}`, marginLeft + 80, yPos);
  }
  yPos += 5;

  if (report.assignedTeamLeader) {
    pdf.text(`Zugewiesener Teamleiter: ${report.assignedTeamLeader}`, marginLeft, yPos);
    yPos += 10;
  }
  yPos += 5;

  // Zusatzinformationen
  if (report.additionalExcelData && Object.keys(report.additionalExcelData).length > 0) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Artikel- und Zusatzinformationen', marginLeft, yPos);
    yPos += 8;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    
    let col = 0;
    Object.entries(report.additionalExcelData).forEach(([key, value]) => {
      const xPos = marginLeft + (col * 80);
      if (xPos + 75 > pageWidth - marginRight) {
        yPos += 5;
        col = 0;
      }
      pdf.text(`${key}: ${value}`, marginLeft + (col * 80), yPos);
      col++;
    });
    yPos += 15;
  }

  // Problembeschreibung
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Problembeschreibung', marginLeft, yPos);
  yPos += 8;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  
  // Text umbrechen
  const problemLines = pdf.splitTextToSize(report.problemDescription, contentWidth);
  problemLines.forEach((line: string) => {
    if (yPos > 280) { // Neue Seite wenn nötig
      pdf.addPage();
      yPos = 20;
    }
    pdf.text(line, marginLeft, yPos);
    yPos += 4;
  });
  yPos += 10;

  // Korrekturmaßnahme
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Korrekturmaßnahme', marginLeft, yPos);
  yPos += 8;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  
  const actionLines = pdf.splitTextToSize(report.correctiveAction, contentWidth);
  actionLines.forEach((line: string) => {
    if (yPos > 280) {
      pdf.addPage();
      yPos = 20;
    }
    pdf.text(line, marginLeft, yPos);
    yPos += 4;
  });

  // PDF herunterladen
  pdf.save(`Fehlermeldung_${report.id}.pdf`);
};