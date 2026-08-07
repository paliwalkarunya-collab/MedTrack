import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType, NotFoundException } from '@zxing/library';
import { Camera, CheckCircle2, ScanLine, X } from 'lucide-react';

const supportedFormats = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.CODE_128,
  BarcodeFormat.QR_CODE,
];

const stopVideoStream = (video) => {
  const stream = video?.srcObject;
  if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
  if (video) video.srcObject = null;
};

export const BarcodeCameraModal = ({ isOpen, onClose, onDetected }) => {
  const videoRef = useRef(null);
  const onDetectedRef = useRef(onDetected);
  const lastFrameLogRef = useRef(0);
  const failureCountRef = useRef(0);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Preparing camera…');
  const [detectedBarcode, setDetectedBarcode] = useState('');
  const [resultMessage, setResultMessage] = useState('');

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, supportedFormats);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints, {
      delayBetweenScanAttempts: 120,
      delayBetweenScanSuccess: 500,
    });
    const constraints = {
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        advanced: [{ focusMode: 'continuous' }],
      },
    };
    let controls;
    let isActive = true;

    const stopScanner = () => {
      controls?.stop();
      stopVideoStream(videoRef.current);
    };

    const startScanner = async () => {
      try {
        console.info('[BarcodeScanner] Starting continuous camera decoding.');
        controls = await reader.decodeFromConstraints(constraints, videoRef.current, (result, decodeError) => {
          if (!isActive) return;

          const now = Date.now();
          if (now - lastFrameLogRef.current > 1500) {
            console.debug('[BarcodeScanner] Frame decoding.');
            lastFrameLogRef.current = now;
          }

          if (result) {
            const barcode = result.getText();
            console.info('[BarcodeScanner] Barcode detected.', { barcode, format: result.getBarcodeFormat() });
            console.info('[BarcodeScanner] Barcode value.', barcode);
            isActive = false;
            stopScanner();
            setDetectedBarcode(barcode);
            setStatus('Barcode detected — camera stopped.');
            const outcome = onDetectedRef.current(barcode);
            setResultMessage(outcome?.message || 'Barcode captured successfully.');
            return;
          }

          if (decodeError && !(decodeError instanceof NotFoundException)) {
            console.warn('[BarcodeScanner] Decode error.', decodeError);
          }
          failureCountRef.current += 1;
          if (failureCountRef.current % 45 === 0) {
            const message = 'Still scanning frames. Improve lighting, hold the code steady, and keep it within the guide.';
            console.info('[BarcodeScanner] Repeated decode attempts failed.', { attempts: failureCountRef.current });
            setStatus(message);
          }
        });
        console.info('[BarcodeScanner] Camera started.', { constraints, supportedFormats });
        setStatus('Camera started. Scanning frames continuously…');
      } catch (scannerError) {
        console.error('[BarcodeScanner] Camera could not start.', scannerError);
        if (isActive) setError(scannerError.message || 'Camera access could not be started.');
      }
    };

    startScanner();
    return () => {
      isActive = false;
      stopScanner();
      console.info('[BarcodeScanner] Camera stopped.');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="barcode-camera-title">
      <button type="button" aria-label="Close camera scanner" onClick={onClose} className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs" />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-200/70 dark:border-slate-800"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center"><Camera className="w-5 h-5" /></div><div><h3 id="barcode-camera-title" className="text-base font-bold text-slate-900 dark:text-white">Scan Barcode</h3><p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">EAN-13, EAN-8, UPC-A, Code-128, and QR Code supported.</p></div></div><button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button></div>
        <div className="p-5"><div className="rounded-xl overflow-hidden bg-slate-950 aspect-video relative"><video ref={videoRef} className="w-full h-full object-cover" muted playsInline /><div className="absolute inset-[18%_12%] border-2 border-white/70 rounded-xl pointer-events-none" /></div>{detectedBarcode ? <div className="mt-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 px-4 py-3 text-emerald-700 dark:text-emerald-300"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"><CheckCircle2 className="w-4 h-4" />Detected Barcode</div><div className="mt-1 text-base font-extrabold break-all">{detectedBarcode}</div><p className="mt-1 text-xs font-medium">{resultMessage}</p></div> : <div className="mt-3 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400"><ScanLine className="w-4 h-4 shrink-0 text-blue-600" />{error || status}</div>}</div>
      </div>
    </div>
  );
};
