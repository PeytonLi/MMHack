import { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, RotateCcw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SKU_DATA } from '@/lib/freshness';
import { SupportedSku } from '@/types/freshness';

interface CameraCaptureProps {
  sku: SupportedSku;
  onCapture: (imageDataUrl: string) => void;
  onBack: () => void;
}

export function CameraCapture({ sku, onCapture, onBack }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const skuInfo = SKU_DATA[sku];

  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } } })
      .then((s) => {
        if (!active) { s.getTracks().forEach(t => t.stop()); return; }
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch(() => setError('Camera access denied. Please allow camera permissions.'));
    return () => { active = false; stream?.getTracks().forEach(t => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCaptured(dataUrl);
  }, []);

  const retake = useCallback(() => setCaptured(null), []);

  const confirm = useCallback(() => {
    if (captured) onCapture(captured);
  }, [captured, onCapture]);

  return (
    <div className="flex flex-col items-center gap-6 px-6 py-8">
      <div className="flex items-center gap-3 w-full max-w-lg">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-3xl">{skuInfo.emoji}</span>
          <div>
            <h2 className="text-xl font-bold">Scan {skuInfo.label}</h2>
            <p className="text-sm text-muted-foreground">Position the item clearly in frame</p>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-lg aspect-[4/3] rounded-2xl overflow-hidden bg-foreground/5"
        style={{ boxShadow: 'var(--shadow-elevated)' }}
      >
        {error ? (
          <div className="flex items-center justify-center h-full p-8 text-center text-muted-foreground">
            {error}
          </div>
        ) : captured ? (
          <img src={captured} alt="Captured produce" className="w-full h-full object-cover" />
        ) : (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        )}

        {!captured && !error && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-8 border-2 border-primary/30 rounded-xl" />
          </div>
        )}
      </motion.div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="flex gap-3 w-full max-w-lg">
        {captured ? (
          <>
            <Button variant="outline" onClick={retake} className="flex-1 gap-2">
              <RotateCcw className="w-4 h-4" /> Retake
            </Button>
            <Button onClick={confirm} className="flex-1 gap-2">
              Analyze Freshness
            </Button>
          </>
        ) : (
          <Button onClick={capture} disabled={!!error} className="flex-1 gap-2 h-14 text-lg">
            <Camera className="w-5 h-5" /> Capture
          </Button>
        )}
      </div>
    </div>
  );
}
