'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, RefreshCw, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface CameraBarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  continuous?: boolean;
}

export default function CameraBarcodeScanner({
  onScan,
  onClose,
  title = 'Scan Barcode with Camera',
  subtitle = 'Align barcode or QR within the frame',
  continuous = true,
}: CameraBarcodeScannerProps) {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isStarting, setIsStarting] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [supportsTorch, setSupportsTorch] = useState(false);

  const html5QrCodeRef = useRef<any>(null);
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const scannerContainerId = 'gmc-camera-barcode-viewfinder';

  // Web Audio API beep
  const playScanBeep = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046, ctx.currentTime); // C6
      osc.frequency.setValueAtTime(1318, ctx.currentTime + 0.06); // E6
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio not permitted or supported
    }
  }, []);

  const handleScanSuccess = useCallback((decodedText: string) => {
    const now = Date.now();
    const clean = decodedText.trim();
    if (!clean) return;

    // Cooldown of 1.6s for the identical barcode to prevent rapid duplicate bursts
    if (lastScannedCodeRef.current === clean && now - lastScannedTimeRef.current < 1600) {
      return;
    }

    lastScannedCodeRef.current = clean;
    lastScannedTimeRef.current = now;
    setLastScanned(clean);
    playScanBeep();

    onScan(clean);

    if (!continuous) {
      onClose();
    }
  }, [continuous, onClose, onScan, playScanBeep]);

  // Start Scanner
  useEffect(() => {
    let isMounted = true;
    let scannerInstance: any = null;

    async function initScanner() {
      try {
        setIsStarting(true);
        setCameraError(null);

        // Dynamically import html5-qrcode for client-side execution
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

        if (!isMounted) return;

        // Check cameras
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back/environment camera on phones
          const backCam = devices.find(
            (d) => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment') || d.label.toLowerCase().includes('rear')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        }

        scannerInstance = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
          ],
          verbose: false,
        });

        html5QrCodeRef.current = scannerInstance;

        const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
          // Responsive scanning box optimized for 1D barcodes and QR
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const width = Math.floor(minEdge * 0.85);
          const height = Math.floor(minEdge * 0.55);
          return { width: Math.max(width, 220), height: Math.max(height, 140) };
        };

        const config = {
          fps: 20,
          qrbox: qrboxFunction,
          aspectRatio: 1.0,
        };

        // Prefer facingMode environment for phones
        await scannerInstance.start(
          { facingMode: 'environment' },
          config,
          (decodedText: string) => {
            if (isMounted) handleScanSuccess(decodedText);
          },
          () => {
            // Ignore frame misses
          }
        );

        if (isMounted) {
          setIsStarting(false);
          // Check if torch is supported
          try {
            const capabilities = scannerInstance.getRunningTrackCapabilities();
            if (capabilities && capabilities.torch) {
              setSupportsTorch(true);
            }
          } catch {
            setSupportsTorch(false);
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        setIsStarting(false);
        console.error('Camera barcode scanner error:', err);
        const msg = typeof err === 'string' ? err : err?.message || 'Could not start camera.';
        if (msg.toLowerCase().includes('notallowederror') || msg.toLowerCase().includes('permission')) {
          setCameraError('Camera permission denied. Please allow camera access in your phone browser settings to scan barcodes.');
        } else if (msg.toLowerCase().includes('notfounderror') || msg.toLowerCase().includes('device')) {
          setCameraError('No camera found on this device.');
        } else {
          setCameraError(`Camera error: ${msg}`);
        }
      }
    }

    initScanner();

    return () => {
      isMounted = false;
      if (scannerInstance) {
        try {
          if (scannerInstance.isScanning) {
            scannerInstance.stop().then(() => {
              scannerInstance.clear();
            }).catch(() => {});
          } else {
            scannerInstance.clear();
          }
        } catch {}
      }
    };
  }, [handleScanSuccess]);

  // Flip camera
  const handleSwitchCamera = async () => {
    if (!html5QrCodeRef.current || cameras.length <= 1) return;
    try {
      setIsStarting(true);
      const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      const nextCamera = cameras[nextIndex];
      setSelectedCameraId(nextCamera.id);

      if (html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }

      await html5QrCodeRef.current.start(
        nextCamera.id,
        {
          fps: 20,
          qrbox: { width: 260, height: 160 },
        },
        handleScanSuccess,
        () => {}
      );
      setIsStarting(false);
    } catch (err: any) {
      setIsStarting(false);
      toast.error('Failed to switch camera');
    }
  };

  // Toggle Torch / Flashlight
  const handleToggleTorch = async () => {
    if (!html5QrCodeRef.current || !supportsTorch) return;
    try {
      const nextState = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }],
      });
      setTorchOn(nextState);
    } catch {
      toast.error('Torch not supported');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-gray-950 text-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-800 flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-800 bg-gray-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <Camera size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white leading-tight">{title}</h3>
              <p className="text-[11px] text-gray-400">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Viewfinder Container */}
        <div className="relative bg-black flex-1 min-h-[300px] flex items-center justify-center overflow-hidden">
          {/* HTML5 Qrcode Render Target */}
          <div id={scannerContainerId} className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />

          {/* Laser Scanning Animation Overlay */}
          {!cameraError && !isStarting && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Target Aim Box Frame */}
              <div className="relative w-[78%] h-[55%] border-2 border-primary-500/70 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                {/* Corner Markers */}
                <span className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-primary-400 rounded-tl-sm" />
                <span className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-primary-400 rounded-tr-sm" />
                <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-primary-400 rounded-bl-sm" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-primary-400 rounded-br-sm" />

                {/* Animated Red / Rose Laser Line */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_8px_#f43f5e] animate-pulse transition-all" />
              </div>
            </div>
          )}

          {/* Loading state */}
          {isStarting && !cameraError && (
            <div className="absolute inset-0 bg-gray-950 flex flex-col items-center justify-center gap-3 text-gray-400 z-10">
              <div className="w-9 h-9 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Accessing phone camera…</p>
            </div>
          )}

          {/* Camera Error / Permission prompt */}
          {cameraError && (
            <div className="absolute inset-0 bg-gray-950 p-6 flex flex-col items-center justify-center text-center gap-3 z-10">
              <AlertCircle size={36} className="text-amber-400" />
              <p className="text-sm text-gray-200 font-medium max-w-xs">{cameraError}</p>
              <button
                onClick={() => window.location.reload()}
                className="btn-primary text-xs mt-2 py-2 px-4"
              >
                Reload & Retry Camera
              </button>
            </div>
          )}

          {/* Last Scanned Tag floating notification */}
          {lastScanned && !cameraError && (
            <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-center animate-in slide-in-from-bottom duration-200 pointer-events-none">
              <div className="bg-emerald-500/90 text-white backdrop-blur-md px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-semibold">
                <CheckCircle2 size={16} />
                <span>Scanned: <code className="font-mono bg-black/20 px-1.5 py-0.5 rounded">{lastScanned}</code></span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Camera Toolbar */}
        <div className="px-5 py-3.5 bg-gray-900 border-t border-gray-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {cameras.length > 1 && (
              <button
                onClick={handleSwitchCamera}
                className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Switch camera"
              >
                <RefreshCw size={14} />
                <span>Flip Camera</span>
              </button>
            )}

            {supportsTorch && (
              <button
                onClick={handleToggleTorch}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ${
                  torchOn ? 'bg-amber-400 text-black font-bold' : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                }`}
              >
                <Zap size={14} />
                <span>{torchOn ? 'Flash ON' : 'Flashlight'}</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-gray-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            Live Auto-Detector
          </p>
        </div>
      </div>
    </div>
  );
}
