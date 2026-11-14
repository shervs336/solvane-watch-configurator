"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { CheckIcon, DownloadIcon, LinkIcon, RotateCcwIcon } from "lucide-react";
import {
  ACCENTS,
  BEZELS,
  CASES,
  DEFAULT_CONFIG,
  DIALS,
  INDICES,
  SIZES,
  STRAPS,
  formatPrice,
  fromSearch,
  pick,
  priceOf,
  toSearch,
  type Option,
  type WatchConfig,
} from "@/lib/config";
import { VIEWS, type SceneApi, type ViewId } from "@/lib/views";

const Scene = dynamic(() => import("@/components/scene"), {
  ssr: false,
  loading: () => <SceneLoading />,
});

function SceneLoading() {
  return (
    <div className="grid h-full place-items-center">
      <div className="flex flex-col items-center gap-3 text-sm text-ink-soft">
        <span className="size-10 animate-spin rounded-full border-2 border-ink/10 border-t-brass" />
        Preparing the atelier…
      </div>
    </div>
  );
}

type GroupKey = keyof WatchConfig;

const SECTIONS: { key: GroupKey; title: string; options: readonly Option[]; style: "swatch" | "chip" }[] = [
  { key: "case", title: "Case", options: CASES, style: "swatch" },
  { key: "bezel", title: "Bezel", options: BEZELS, style: "chip" },
  { key: "dial", title: "Dial", options: DIALS, style: "swatch" },
  { key: "indices", title: "Hour markers", options: INDICES, style: "chip" },
  { key: "accent", title: "Seconds hand", options: ACCENTS, style: "swatch" },
  { key: "strap", title: "Strap", options: STRAPS, style: "swatch" },
  { key: "size", title: "Case size", options: SIZES, style: "chip" },
];

const subscribeToHistory = (cb: () => void) => {
  window.addEventListener("popstate", cb);
  return () => window.removeEventListener("popstate", cb);
};

export function Configurator() {
  // A shared link (?case=rose&dial=salmon…) sets the starting build.
  const search = useSyncExternalStore(subscribeToHistory, () => window.location.search, () => "");
  const [edited, setEdited] = useState<WatchConfig | null>(null);
  const config = edited ?? fromSearch(search);
  const setConfig = (next: WatchConfig) => setEdited(next);

  const [view, setView] = useState<ViewId>("hero");
  const [toast, setToast] = useState<string | null>(null);
  const [hinted, setHinted] = useState(false);
  const scene = useRef<SceneApi>(null);

  // Keep the address bar in sync, so it's always a shareable link.
  useEffect(() => {
    if (!edited) return;
    window.history.replaceState(null, "", `${window.location.pathname}${toSearch(edited)}`);
  }, [edited]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  const price = useMemo(() => priceOf(config), [config]);

  function update<K extends GroupKey>(key: K, value: WatchConfig[K]) {
    setConfig({ ...config, [key]: value });
    // Jump to the view that best shows what changed.
    const target: Partial<Record<GroupKey, ViewId>> = { dial: "dial", indices: "dial", accent: "dial", strap: "hero", bezel: "hero" };
    const v = target[key];
    if (v && v !== view) goTo(v);
  }

  function goTo(v: ViewId) {
    setView(v);
    scene.current?.setView(v);
  }

  async function copyLink() {
    const url = `${window.location.origin}${window.location.pathname}${toSearch(config)}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast("Link copied. Anyone who opens it sees this exact build.");
    } catch {
      setToast("Couldn't copy automatically. The link is in your address bar.");
    }
  }

  async function saveImage() {
    const shot = scene.current?.capture();
    if (!shot) return;
    const img = new Image();
    img.src = shot;
    await img.decode();
    // Compose onto the studio backdrop with a caption.
    const c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(c.width / 2, c.height * 0.42, 0, c.width / 2, c.height / 2, Math.max(c.width, c.height) * 0.75);
    g.addColorStop(0, "#fbf8f3");
    g.addColorStop(1, "#e6dfd3");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0);
    const pad = Math.round(c.width * 0.035);
    const fs = Math.max(14, Math.round(c.width * 0.016));
    ctx.fillStyle = "#2b2620";
    ctx.font = `500 ${fs * 1.6}px Georgia, serif`;
    ctx.fillText("Halden Fjord", pad, c.height - pad - fs * 1.6);
    ctx.font = `${fs}px system-ui, sans-serif`;
    ctx.fillStyle = "#6b6257";
    ctx.fillText(
      `${pick("case", config.case).name} · ${pick("dial", config.dial).name} · ${pick("strap", config.strap).name} · ${formatPrice(price)}`,
      pad,
      c.height - pad,
    );
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png");
    a.download = `halden-fjord-${config.case}-${config.dial}.png`;
    a.click();
    setToast("Image saved.");
  }

  return (
    <div className="grid min-h-dvh grid-cols-1 lg:h-dvh lg:grid-cols-[minmax(0,1fr)_440px]">
      {/* Stage */}
      {/* On phones the preview stays pinned at the top while the options scroll beneath it. */}
      <section
        aria-label="3D preview"
        className="stage sticky top-0 z-20 h-[46svh] min-h-[320px] border-b border-ink/10 lg:relative lg:z-0 lg:h-full lg:border-b-0"
      >
        <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-4 sm:p-8">
          <div className="pointer-events-auto">
            <p className="font-display text-xl tracking-[0.32em] text-ink uppercase sm:text-2xl">Halden</p>
            <p className="mt-1 hidden text-[11px] tracking-[0.25em] text-ink-soft uppercase sm:block">Atelier configurator</p>
          </div>
          <p className="hidden text-right text-[11px] tracking-[0.25em] text-ink-soft uppercase sm:block">
            Fjord · Automatic
            <br />
            Ref. HF-{config.size}
            {config.case.slice(0, 2).toUpperCase()}
          </p>
        </header>

        <div className="absolute inset-0">
          <Scene config={config} apiRef={scene} onInteract={() => setHinted(true)} />
        </div>

        {!hinted && (
          <p className="pointer-events-none absolute bottom-16 left-1/2 hidden -translate-x-1/2 rounded-full bg-white/60 px-3 py-1.5 text-xs text-ink-soft backdrop-blur sm:block">
            Drag to rotate · Scroll to zoom
          </p>
        )}

        <nav aria-label="Camera views" className="absolute inset-x-0 bottom-3 z-10 flex justify-center px-3 sm:bottom-4">
          <div className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-ink/10 bg-white/70 p-1 shadow-soft backdrop-blur-xl">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => goTo(v.id)}
                aria-pressed={view === v.id}
                className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:text-ink aria-pressed:bg-ink aria-pressed:text-paper focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-none"
              >
                {v.label}
              </button>
            ))}
          </div>
        </nav>
      </section>

      {/* Panel */}
      <aside aria-label="Configure your watch" className="relative flex flex-col border-ink/10 bg-paper lg:h-dvh lg:border-l">
        <div className="flex-1 px-5 pt-6 pb-6 sm:px-8 sm:pt-8 lg:overflow-y-auto">
          <p className="text-[11px] tracking-[0.25em] text-brass uppercase">Make it yours</p>
          <h1 className="mt-2 font-display text-4xl leading-none text-ink sm:text-5xl">
            Fjord <span className="italic">{pick("size", config.size).name.replace(" ", "")}</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            A slim automatic with a sunray dial and a hand-finished case. Every combination is built to order in our
            atelier.
          </p>

          <div className="mt-8 divide-y divide-ink/10 border-y border-ink/10">
            {SECTIONS.map((s) => (
              <OptionGroup
                key={s.key}
                title={s.title}
                options={s.options}
                style={s.style}
                value={config[s.key]}
                onChange={(id) => update(s.key, id as never)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setConfig(DEFAULT_CONFIG)}
            className="mt-5 inline-flex items-center gap-1.5 text-xs text-ink-soft underline-offset-4 hover:text-ink hover:underline"
          >
            <RotateCcwIcon className="size-3.5" /> Reset to signature build
          </button>
        </div>

        {/* Summary bar */}
        <div className="sticky bottom-0 border-t border-ink/10 bg-paper/90 px-5 py-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] tracking-[0.2em] text-ink-soft uppercase">Your Fjord</p>
              <p aria-live="polite" className="font-display text-3xl leading-tight text-ink tabular-nums">
                {formatPrice(price)}
              </p>
            </div>
            <div className="flex gap-1.5">
              <IconButton label="Copy share link" onClick={copyLink}>
                <LinkIcon className="size-4" />
              </IconButton>
              <IconButton label="Save image of this view" onClick={saveImage}>
                <DownloadIcon className="size-4" />
              </IconButton>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setToast("Thanks! This is a portfolio demo, so no order was placed.")}
            className="mt-3 h-12 w-full rounded-full bg-ink text-sm font-medium tracking-wide text-paper transition-transform hover:scale-[1.01] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Reserve this build
          </button>
          <p className="mt-2 text-center text-[11px] text-ink-soft">Complimentary engraving · 5-year warranty · Ships in 6 weeks</p>
        </div>

        <div aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-36 flex justify-center px-6">
          {toast && (
            <p className="toast-in inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs text-paper shadow-soft">
              <CheckIcon className="size-3.5 text-brass" /> {toast}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function OptionGroup({
  title,
  options,
  value,
  onChange,
  style,
}: {
  title: string;
  options: readonly Option[];
  value: string;
  onChange: (id: string) => void;
  style: "swatch" | "chip";
}) {
  const selected = options.find((o) => o.id === value) ?? options[0];
  return (
    <fieldset className="py-5">
      <div className="flex items-baseline justify-between gap-3">
        <legend className="text-[11px] tracking-[0.22em] text-ink-soft uppercase">{title}</legend>
        <p className="text-sm text-ink">
          {selected.name}
          {selected.price > 0 && <span className="ml-1.5 text-ink-soft">+{formatPrice(selected.price)}</span>}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) =>
          style === "swatch" ? (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              aria-pressed={o.id === value}
              aria-label={`${o.name}${o.price ? `, plus ${formatPrice(o.price)}` : ""}`}
              title={o.name}
              className="group relative grid size-11 place-items-center rounded-full ring-1 ring-ink/10 transition-all hover:ring-ink/30 aria-pressed:ring-2 aria-pressed:ring-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
            >
              <span
                className="size-8 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.25),inset_0_-1px_1px_rgba(255,255,255,0.4)] transition-transform group-hover:scale-105"
                style={{ background: o.swatch }}
              />
            </button>
          ) : (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              aria-pressed={o.id === value}
              className="rounded-full border border-ink/15 px-4 py-2 text-sm text-ink-soft transition-colors hover:border-ink/40 hover:text-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
            >
              {o.name}
            </button>
          ),
        )}
      </div>
    </fieldset>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-11 place-items-center rounded-full border border-ink/15 text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:ring-2 focus-visible:ring-brass focus-visible:outline-none"
    >
      {children}
    </button>
  );
}
