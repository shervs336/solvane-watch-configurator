"use client";

import { useEffect, useRef, useState, type DetailedHTMLProps, type HTMLAttributes } from "react";
import { XIcon } from "lucide-react";

// <model-viewer> (Google, Apache-2.0) handles AR: WebXR on Android Chrome, Quick Look on iOS
// (it converts the glTF to USDZ itself). Loaded only when this dialog opens.
const MODEL_VIEWER = "https://cdn.jsdelivr.net/npm/@google/model-viewer@4.4.0/dist/model-viewer.min.js";

type ModelViewerProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & Record<string, unknown>;
declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerProps;
    }
  }
}

let loader: Promise<void> | null = null;
function loadModelViewer() {
  loader ??= new Promise((resolve, reject) => {
    if (customElements.get("model-viewer")) return resolve();
    const s = document.createElement("script");
    s.type = "module";
    s.src = MODEL_VIEWER;
    s.onload = () => customElements.whenDefined("model-viewer").then(() => resolve());
    s.onerror = () => {
      loader = null;
      reject(new Error("Couldn't load the 3D viewer."));
    };
    document.head.appendChild(s);
  });
  return loader;
}

type Props = { open: boolean; onClose: () => void; exportGlb: () => Promise<Blob>; shareUrl: string; title: string };

export function ArDialog({ open, onClose, exportGlb, shareUrl, title }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const viewer = useRef<HTMLElement & { canActivateAR?: boolean; activateAR?: () => void }>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canAR, setCanAR] = useState<boolean | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
    if (!open) return;
    let url: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const [blob] = await Promise.all([exportGlb(), loadModelViewer()]);
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
        const { toDataURL } = await import("qrcode");
        const arLink = `${shareUrl}${shareUrl.includes("?") ? "&" : "?"}ar=1`;
        setQr(await toDataURL(arLink, { margin: 1, width: 360, color: { dark: "#2b2620", light: "#fbf8f3" } }));
      } catch (e) {
        if (!cancelled) setError((e as Error).message || "Couldn't prepare the 3D model.");
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      setSrc(null);
      setCanAR(null);
    };
  }, [open, exportGlb, shareUrl]);

  // Once the model loads, model-viewer knows whether this device can do AR.
  useEffect(() => {
    const el = viewer.current;
    if (!el || !src) return;
    const onLoad = () => setCanAR(!!el.canActivateAR);
    el.addEventListener("load", onLoad);
    return () => el.removeEventListener("load", onLoad);
  }, [src]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      aria-labelledby="ar-title"
      className="m-auto w-[min(720px,calc(100vw-1.5rem))] rounded-3xl bg-paper p-0 text-ink shadow-2xl backdrop:bg-ink/40"
    >
      <div className="flex items-center gap-3 px-6 pt-5">
        <h2 id="ar-title" className="font-serif text-2xl">
          See it in your space
        </h2>
        <button type="button" onClick={() => ref.current?.close()} aria-label="Close" className="ml-auto rounded-full p-1.5 text-ink-soft hover:bg-ink/5">
          <XIcon className="size-4" />
        </button>
      </div>
      <div className="grid gap-5 p-6 pt-4 sm:grid-cols-[minmax(0,1fr)_200px]">
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_40%,#fbf8f3,#e6dfd3)]">
          {src ? (
            <model-viewer
              ref={viewer}
              src={src}
              alt={`3D model of the ${title}`}
              ar=""
              ar-modes="webxr quick-look"
              ar-scale="fixed"
              camera-controls=""
              auto-rotate=""
              shadow-intensity="1"
              exposure="1.05"
              environment-image="neutral"
              camera-orbit="30deg 70deg auto"
              style={{ width: "100%", height: "100%", background: "transparent" }}
              data-testid="model-viewer"
            >
              <button
                slot="ar-button"
                type="button"
                className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper shadow-soft"
              >
                Place it in your room
              </button>
            </model-viewer>
          ) : (
            <div className="grid h-full place-items-center text-sm text-ink-soft">
              {error ?? (
                <span className="flex flex-col items-center gap-3">
                  <span className="size-9 animate-spin rounded-full border-2 border-ink/10 border-t-brass" />
                  Preparing your build…
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 text-sm text-ink-soft">
          <p>
            This is your exact build, at its real size (about 41 mm across). Drag to turn it.
          </p>
          {canAR === false && qr && (
            <div>
              <p className="text-ink">To place it on your desk or wrist, scan with your phone:</p>
              {/* eslint-disable-next-line @next/next/no-img-element -- a generated data URL */}
              <img src={qr} alt="QR code that opens this build in AR on a phone" className="mt-2 w-full max-w-[180px] rounded-xl" data-testid="ar-qr" />
            </div>
          )}
          {canAR && <p className="text-ink">Tap <strong>Place it in your room</strong> and point your camera at a flat surface.</p>}
          <p className="mt-auto text-xs">AR works in Chrome on ARCore Android phones and in Safari on iPhone and iPad.</p>
        </div>
      </div>
    </dialog>
  );
}
