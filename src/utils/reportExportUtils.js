import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const exportReportToPdf = (title, columns, data, summaryStats, filters) => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.text('MedTrack Reports', 14, 22);
  
  doc.setFontSize(14);
  doc.text(title, 14, 32);
  
  doc.setFontSize(10);
  let y = 40;
  
  // Filters
  if (filters && filters.length > 0) {
    doc.text('Applied Filters:', 14, y);
    y += 6;
    filters.forEach(filter => {
      doc.text(`- ${filter}`, 14, y);
      y += 6;
    });
    y += 4;
  }
  
  // Summary Stats
  if (summaryStats && summaryStats.length > 0) {
    doc.text('Summary:', 14, y);
    y += 6;
    summaryStats.forEach(stat => {
      doc.text(`- ${stat.label}: ${stat.value}`, 14, y);
      y += 6;
    });
    y += 4;
  }
  
  doc.autoTable({
    startY: y,
    head: [columns.map(col => col.header)],
    body: data.map(row => columns.map(col => row[col.key])),
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] }
  });
  
  doc.save(`MedTrack_${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportReportToExcel = (title, columns, data, summaryStats, filters) => {
  const wb = XLSX.utils.book_new();
  
  const wsData = [];
  
  // Title
  wsData.push([title]);
  wsData.push([]);
  
  // Filters
  if (filters && filters.length > 0) {
    wsData.push(['Filters']);
    filters.forEach(filter => wsData.push([filter]));
    wsData.push([]);
  }
  
  // Summary
  if (summaryStats && summaryStats.length > 0) {
    wsData.push(['Summary']);
    summaryStats.forEach(stat => wsData.push([stat.label, stat.value]));
    wsData.push([]);
  }
  
  // Headers
  wsData.push(columns.map(col => col.header));
  
  // Data
  data.forEach(row => {
    wsData.push(columns.map(col => row[col.key]));
  });
  
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  
  XLSX.writeFile(wb, `MedTrack_${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
};
