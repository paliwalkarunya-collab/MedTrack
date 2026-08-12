import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { generateInvoicePdf } from '../../utils/invoiceUtils';
import { businessConfig } from "../../constants/businessConfig";

const InvoicePreviewModal = ({ invoice, isOpen, onClose }) => {
    const [qrCodeUrl, setQrCodeUrl] = useState('');

    useEffect(() => {
        if (invoice?.invoiceId) {
            QRCode.toDataURL(invoice.invoiceId, { width: 80, margin: 1 })
                .then(url => setQrCodeUrl(url))
                .catch(err => console.error("QR Code generation failed:", err));
        }
    }, [invoice]);

    if (!isOpen || !invoice) return null;
    const handleDownload = () => generateInvoicePdf(invoice, "download");
    const handlePrint = () => generateInvoicePdf(invoice, "print");

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto print:p-0 print:bg-white print:inset-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col print:shadow-none print:max-w-none print:max-h-none print:w-[210mm]">

                <div className="flex justify-between items-center p-4 border-b print:hidden">
                    <h2 className="text-xl font-bold">Invoice Preview</h2>
                    <div className="flex space-x-2">
                        <button onClick={handlePrint} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Print</button>
                        <button onClick={handleDownload} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">Download PDF</button>
                        <button onClick={onClose} className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors">Close</button>
                    </div>
                </div>

                <div id="invoice-printable-area" className="p-8 overflow-y-auto bg-white text-black print:overflow-visible print:p-0">
                    <div className="text-center mb-6 border-b pb-4">
                        <h1 className="text-3xl font-bold uppercase tracking-wider text-gray-900">{businessConfig.name}</h1>
                        <p className="text-gray-600 mt-1">{businessConfig.address}</p>
                        <p className="text-gray-600">Phone: {businessConfig.phone} | GSTIN: {businessConfig.gstin}</p>
                    </div>

                    <div className="flex justify-between mb-8 text-sm">
                        <div className="space-y-1">
                            <p><span className="font-semibold text-gray-700">Customer:</span> {invoice.customerName || 'Walk-in'}</p>
                            <p><span className="font-semibold text-gray-700">Phone:</span> {invoice.phone || 'N/A'}</p>
                            <p><span className="font-semibold text-gray-700">Doctor:</span> {invoice.doctor || 'Self'}</p>
                        </div>
                        <div className="text-right space-y-1">
                            <p className="text-lg font-bold text-gray-900">{invoice.invoiceId}</p>
                            <p><span className="font-semibold text-gray-700">Date:</span> {invoice.date}</p>
                            <p><span className="font-semibold text-gray-700">Time:</span> {invoice.time}</p>
                            <p><span className="font-semibold text-gray-700">Payment:</span> {invoice.paymentMethod || 'Cash'}</p>
                        </div>
                    </div>

                    <table className="w-full mb-8 border-collapse text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-y-2 border-gray-300 text-left text-gray-700 font-semibold break-inside-avoid">
                                <th className="py-3 px-2 w-1/3">Product</th>
                                <th className="py-3 px-2 w-1/6">Batch</th>
                                <th className="py-3 px-2 text-right w-1/12">Qty</th>
                                <th className="py-3 px-2 text-right w-1/6">Rate</th>
                                <th className="py-3 px-2 text-right w-1/12">GST %</th>
                                <th className="py-3 px-2 text-right w-1/6">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-800">
                            {invoice.items && invoice.items.map((item, index) => (
                                <React.Fragment key={index}>
                                    <tr className="border-b border-gray-100 break-inside-avoid bg-gray-50/30">
                                        <td className="py-2 px-2 font-bold break-words text-black" colSpan={6}>{item.medicine?.name || 'Unknown'}</td>
                                    </tr>
                                    {item.batchUsed?.map((batch, bIndex) => (
                                        <tr key={`${index}-${bIndex}`} className="border-b border-gray-200 break-inside-avoid text-sm">
                                            <td className="py-2 px-2 pl-4 text-gray-500 text-xs">
                                                Exp: {batch.expiryDate || 'Not available'}<br/>
                                                Loc: {batch.rackLocation || 'Location not assigned'}
                                            </td>
                                            <td className="py-2 px-2 text-gray-700">{batch.batchNumber}</td>
                                            <td className="py-2 px-2 text-right font-medium">{batch.quantitySold}</td>
                                            <td className="py-2 px-2 text-right">₹{Number(item.pricePerUnit || 0).toFixed(2)}</td>
                                            <td className="py-2 px-2 text-right">{batch.gst || 0}%</td>
                                            <td className="py-2 px-2 text-right">₹{(Number(batch.quantitySold || 0) * Number(item.pricePerUnit || 0)).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex justify-between items-start mt-8 pt-4 break-inside-avoid">
                        <div className="qr-code p-2 border rounded bg-white flex flex-col items-center shadow-sm">
                            {qrCodeUrl ? (
                                <img src={qrCodeUrl} alt="Invoice QR" className="w-20 h-20" />
                            ) : (
                                <div className="w-20 h-20 bg-gray-100 flex items-center justify-center text-xs">Loading...</div>
                            )}
                            <p className="text-xs text-gray-500 mt-2 font-medium">Invoice ID</p>
                        </div>

                        <div className="w-1/2 md:w-1/3 text-sm">
                            <div className="flex justify-between py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Subtotal:</span>
                                <span className="text-gray-800 font-semibold">₹{Number(invoice.subtotal || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-100 text-red-600">
                                <span className="font-medium">Discount:</span>
                                <span className="font-semibold">- ₹{Number(invoice.discount || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-100">
                                <span className="text-gray-600 font-medium">Total GST:</span>
                                <span className="text-gray-800 font-semibold">₹{Number(invoice.totalGst || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-3 mt-2 border-t-2 border-gray-800 text-lg font-bold text-gray-900">
                                <span>Grand Total:</span>
                                <span>₹{Number(invoice.grandTotal || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-12 text-center text-xs text-gray-500 border-t pt-4 break-inside-avoid">
                        <p className="font-medium">Thank you for choosing us!</p>
                        <p>Goods once sold will not be taken back. Keep this invoice for your records.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoicePreviewModal;