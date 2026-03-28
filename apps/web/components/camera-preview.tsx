"use client";

import { useEffect, useRef, useState } from "react";

export function CameraPreview() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [capturedAt, setCapturedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function attachCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser does not support camera access.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: {
              ideal: "environment",
            },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (cameraError) {
        setError(cameraError instanceof Error ? cameraError.message : "Unable to access the camera.");
      }
    }

    attachCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="space-y-4 rounded-[28px] border border-ink/10 bg-white/85 p-4 shadow-panel">
      <div className="aspect-[3/4] overflow-hidden rounded-[22px] bg-ink/90">
        {error ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-mist">{error}</div>
        ) : (
          <video autoPlay className="h-full w-full object-cover" muted playsInline ref={videoRef} />
        )}
      </div>
      <div className="flex items-center justify-between gap-3">
        <button
          className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-mist transition hover:bg-moss"
          onClick={() => setCapturedAt(new Date().toLocaleTimeString())}
          type="button"
        >
          Capture Placeholder Frame
        </button>
        <span className="text-xs uppercase tracking-[0.24em] text-ink/50">
          {capturedAt ? `Captured ${capturedAt}` : "Live preview only"}
        </span>
      </div>
    </div>
  );
}
