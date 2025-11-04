import jsPDF from 'jspdf';
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

export const generatePDF = async (report: ErrorReport) => {
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

  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text('Fehlermeldung', 105, 20, { align: 'center' });
  
  // Meldungsnummer
  doc.setFontSize(12);
  doc.text(`Meldungsnummer: ${report.id}`, 20, 35);
  
  let yPos = 50;
  const lineHeight = 8;
  
  // Basic Information Section
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Grundinformationen', 20, yPos);
  yPos += lineHeight + 2;
  
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  
  const basicInfo = [
    `Ba-Nr.: ${report.orderNumber}`,
    `AFO-Nummer: ${report.afoNumber || 'Nicht angegeben'}`,
    `Feststellort: ${machineName || 'Nicht angegeben'}`,
    `Fehlerhafte Menge: ${report.defectiveQuantity} (${report.quantityType || 'Ausschussmenge'})`,
    `Ersteller: ${report.creator}`,
    `Personalnummer: ${report.personalNumber}`,
    `Erstellt am: ${new Date(report.createdAt).toLocaleString('de-DE')}`,
  ];
  
  basicInfo.forEach(line => {
    doc.text(line, 20, yPos);
    yPos += lineHeight;
  });
  
  yPos += 5;
  
  // Problem Description
  doc.setFont(undefined, 'bold');
  doc.text('Problembeschreibung:', 20, yPos);
  yPos += lineHeight;
  doc.setFont(undefined, 'normal');
  
  const problemLines = doc.splitTextToSize(report.problemDescription, 170);
  problemLines.forEach((line: string) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(line, 20, yPos);
    yPos += lineHeight;
  });
  
  yPos += 5;
  
  // Error Cause
  doc.setFont(undefined, 'bold');
  doc.text('Fehlerursache:', 20, yPos);
  yPos += lineHeight;
  doc.setFont(undefined, 'normal');
  
  const causeLines = doc.splitTextToSize(report.errorCause, 170);
  causeLines.forEach((line: string) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(line, 20, yPos);
    yPos += lineHeight;
  });
  
  yPos += 5;
  
  // Corrective Action
  doc.setFont(undefined, 'bold');
  doc.text('Korrekturmaßnahme:', 20, yPos);
  yPos += lineHeight;
  doc.setFont(undefined, 'normal');
  
  const actionLines = doc.splitTextToSize(report.correctiveAction, 170);
  actionLines.forEach((line: string) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(line, 20, yPos);
    yPos += lineHeight;
  });
  
  yPos += 10;
  
  // Approval Status
  doc.setFont(undefined, 'bold');
  doc.text('Freigabestatus:', 20, yPos);
  yPos += lineHeight;
  doc.setFont(undefined, 'normal');
  doc.text(getStatusText(report.approvalStatus), 20, yPos);
  
  if (report.approvalStatus === 'approved' && approvedByName) {
    yPos += lineHeight;
    doc.text(`Freigegeben von: ${approvedByName}`, 20, yPos);
    if (report.approvedAt) {
      yPos += lineHeight;
      doc.text(`Freigegeben am: ${new Date(report.approvedAt).toLocaleString('de-DE')}`, 20, yPos);
    }
  }
  
  if (report.approvalStatus === 'rejected') {
    if (rejectedByName) {
      yPos += lineHeight;
      doc.text(`Abgelehnt von: ${rejectedByName}`, 20, yPos);
    }
    if (report.rejectedAt) {
      yPos += lineHeight;
      doc.text(`Abgelehnt am: ${new Date(report.rejectedAt).toLocaleString('de-DE')}`, 20, yPos);
    }
    if (report.rejectionReason) {
      yPos += lineHeight;
      doc.setFont(undefined, 'bold');
      doc.text('Ablehnungsgrund:', 20, yPos);
      yPos += lineHeight;
      doc.setFont(undefined, 'normal');
      const rejectionLines = doc.splitTextToSize(report.rejectionReason, 170);
      rejectionLines.forEach((line: string) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, 20, yPos);
        yPos += lineHeight;
      });
    }
  }
  
  // Additional Excel Data
  if (report.additionalExcelData && Object.keys(report.additionalExcelData).length > 0) {
    yPos += 10;
    
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFont(undefined, 'bold');
    doc.text('Zusätzliche Informationen:', 20, yPos);
    yPos += lineHeight;
    doc.setFont(undefined, 'normal');
    
    Object.entries(report.additionalExcelData).forEach(([key, value]) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`${key}: ${value}`, 20, yPos);
      yPos += lineHeight;
    });
  }
  
  // Save PDF
  doc.save(`Fehlermeldung_${report.id}.pdf`);
};
