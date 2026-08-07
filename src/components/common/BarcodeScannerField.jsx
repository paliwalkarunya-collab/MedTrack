import { useCallback, useRef, useState } from 'react';
import { Camera, ScanLine } from 'lucide-react';
import { BarcodeCameraModal } from './BarcodeCameraModal';

export const BarcodeScannerField = ({ value, onChange, onScan, label = 'Barcode', placeholder = 'Enter or scan barcode', className = '' }) => {
  const inputRef = useRef(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const submitBarcode = useCallback((barcode) => {
    const normalizedBarcode = barcode.trim();
    if (!normalizedBarcode) return;
    onChange(normalizedBarcode);
    return onScan?.(normalizedBarcode);
  }, [onChange, onScan]);
  const handleDetected = useCallback((barcode) => {
    return submitBarcode(barcode);
  }, [submitBarcode]);

  return (
    <div className={className}>
      <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{label}</span>
      <div className="flex gap-2"><div className="relative flex-1"><ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input ref={inputRef} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submitBarcode(event.currentTarget.value); } }} placeholder={placeholder} className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50/80 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 rounded-xl border border-slate-200/70 dark:border-slate-700/70 focus:border-blue-500/80 focus:outline-none focus:ring-4 focus:ring-blue-500/10" /></div><button type="button" onClick={() => setIsCameraOpen(true)} className="shrink-0 inline-flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl"><Camera className="w-4 h-4" /><span className="hidden sm:inline">Scan with Camera</span></button></div>
      <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">Manual entry or USB scanner supported; press Enter after scanning.</p>
      {isCameraOpen && <BarcodeCameraModal isOpen={isCameraOpen} onClose={() => { setIsCameraOpen(false); inputRef.current?.focus(); }} onDetected={handleDetected} />}
    </div>
  );
};
