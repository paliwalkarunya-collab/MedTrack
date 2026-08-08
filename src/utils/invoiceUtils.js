import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

const money = (value) => Number(value || 0).toFixed(2);

export const generateInvoicePdf = async (invoice, mode = 'download') => {
  const pdf = new jsPDF({ format: 'a4', unit: 'mm' });
  const qrCode = await QRCode.toDataURL(invoice.invoiceId, { width: 160, margin: 1 });
  pdf.setFontSize(20); pdf.text('MedTrack Pharmacy', 14, 18);
  pdf.setFontSize(10); pdf.text(`Invoice: ${invoice.invoiceId}`, 14, 26); pdf.text(`Date: ${new Date(invoice.createdAt).toLocaleString()}`, 14, 32);
  pdf.addImage(qrCode, 'PNG', 170, 12, 25, 25);
  pdf.text(`Customer: ${invoice.customer.name || 'Walk-in Customer'}`, 14, 42); pdf.text(`Phone: ${invoice.customer.phone || '—'}`, 14, 48); pdf.text(`Doctor: ${invoice.customer.doctor || '—'}`, 14, 54); pdf.text(`Payment: ${invoice.paymentMethod}`, 14, 60);
  let y = 72; pdf.setFontSize(9); pdf.text('Product', 14, y); pdf.text('Batch', 72, y); pdf.text('Quantity', 104, y); pdf.text('Rate', 130, y); pdf.text('GST', 151, y); pdf.text('Amount', 171, y); y += 4; pdf.line(14, y, 196, y); y += 6;
  invoice.items.forEach((item) => { const batch = item.batchUsed.map((allocation) => allocation.batchNumber).join(', '); pdf.text(item.medicine.name.slice(0, 30), 14, y); pdf.text(batch.slice(0, 16), 72, y); pdf.text(String(item.packs + item.looseUnits), 104, y); pdf.text(money(item.pricePerUnit), 130, y); pdf.text(`${item.batchUsed[0]?.gst || 0}%`, 151, y); pdf.text(money(item.lineTotal), 171, y); y += 7; });
  y += 4; pdf.line(125, y, 196, y); y += 7; pdf.text(`Subtotal: ${money(invoice.subtotal)}`, 145, y); y += 6; pdf.text(`Discount: ${money(invoice.discount)}`, 145, y); y += 6; pdf.text(`GST: ${money(invoice.gst)}`, 145, y); y += 6; pdf.setFontSize(12); pdf.text(`Grand Total: ${money(invoice.grandTotal)}`, 145, y); pdf.setFontSize(10); pdf.text('Thank you for choosing MedTrack Pharmacy.', 14, 285); pdf.text('Powered by MedTrack', 14, 290);
  if (mode === 'print') { const url = pdf.output('bloburl'); window.open(url, '_blank'); } else pdf.save(`${invoice.invoiceId}.pdf`);
};
