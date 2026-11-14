// Everything the configurator can change, with prices.
// Solvane is a fictional watchmaker made for this portfolio project.

export type Option<Id extends string = string> = {
  id: Id;
  name: string;
  price: number;
  swatch: string; // CSS color for the UI swatch
};

export type MetalOption = Option & { color: string; roughness: number; metalness: number };

export const CASES = [
  { id: "steel", name: "Polished steel", price: 0, swatch: "#d3d6db", color: "#d6d9de", roughness: 0.16, metalness: 1 },
  { id: "titanium", name: "Brushed titanium", price: 650, swatch: "#9fa3a7", color: "#a7abaf", roughness: 0.42, metalness: 1 },
  { id: "black", name: "Black DLC", price: 900, swatch: "#2a2a2e", color: "#2b2b2f", roughness: 0.3, metalness: 0.9 },
  { id: "yellow", name: "18k yellow gold", price: 8400, swatch: "#e6c07a", color: "#efc77d", roughness: 0.18, metalness: 1 },
  { id: "rose", name: "18k rose gold", price: 8900, swatch: "#e8ae97", color: "#efb49c", roughness: 0.18, metalness: 1 },
] as const satisfies readonly MetalOption[];

export const BEZELS = [
  { id: "polished", name: "Polished", price: 0, swatch: "transparent" },
  { id: "fluted", name: "Fluted", price: 450, swatch: "transparent" },
  { id: "noir", name: "Ceramic · Noir", price: 700, swatch: "#141416" },
  { id: "bleu", name: "Ceramic · Bleu", price: 700, swatch: "#1d3461" },
] as const satisfies readonly Option[];

export const DIALS = [
  { id: "midnight", name: "Midnight blue", price: 0, swatch: "#1e3a5f" },
  { id: "forest", name: "Forest green", price: 0, swatch: "#1f4a3a" },
  { id: "salmon", name: "Salmon", price: 250, swatch: "#e5a088" },
  { id: "slate", name: "Slate black", price: 0, swatch: "#1b1b1e" },
  { id: "opaline", name: "Silver opaline", price: 0, swatch: "#d9d8d3" },
  { id: "ice", name: "Glacier blue", price: 350, swatch: "#b6d1df" },
] as const satisfies readonly Option[];

export const INDICES = [
  { id: "baton", name: "Applied batons", price: 0, swatch: "transparent" },
  { id: "dot", name: "Applied dots", price: 0, swatch: "transparent" },
] as const satisfies readonly Option[];

export const ACCENTS = [
  { id: "red", name: "Signal red", price: 0, swatch: "#d83a2e" },
  { id: "orange", name: "Racing orange", price: 0, swatch: "#f2711c" },
  { id: "lime", name: "Lume green", price: 0, swatch: "#c4ec4a" },
  { id: "metal", name: "Case metal", price: 0, swatch: "conic-gradient(#ddd,#888,#eee,#999,#ddd)" },
] as const satisfies readonly Option[];

export const STRAPS = [
  { id: "tan", name: "Tan leather", price: 0, swatch: "#a5683a", kind: "leather" },
  { id: "espresso", name: "Espresso leather", price: 0, swatch: "#3d2519", kind: "leather" },
  { id: "noir", name: "Black leather", price: 0, swatch: "#161616", kind: "leather" },
  { id: "navy", name: "Navy rubber", price: 90, swatch: "#1f2d4a", kind: "rubber" },
  { id: "rubber", name: "Black rubber", price: 90, swatch: "#121212", kind: "rubber" },
  { id: "bracelet", name: "Matching bracelet", price: 1150, swatch: "conic-gradient(#ddd,#888,#eee,#999,#ddd)", kind: "bracelet" },
] as const satisfies readonly (Option & { kind: "leather" | "rubber" | "bracelet" })[];

export const SIZES = [
  { id: "36", name: "36 mm", price: 0, swatch: "transparent", scale: 0.947 },
  { id: "38", name: "38 mm", price: 0, swatch: "transparent", scale: 1 },
  { id: "40", name: "40 mm", price: 200, swatch: "transparent", scale: 1.053 },
] as const satisfies readonly (Option & { scale: number })[];

export const BASE_PRICE = 4250;

export type WatchConfig = {
  case: (typeof CASES)[number]["id"];
  bezel: (typeof BEZELS)[number]["id"];
  dial: (typeof DIALS)[number]["id"];
  indices: (typeof INDICES)[number]["id"];
  accent: (typeof ACCENTS)[number]["id"];
  strap: (typeof STRAPS)[number]["id"];
  size: (typeof SIZES)[number]["id"];
};

export const DEFAULT_CONFIG: WatchConfig = {
  case: "steel",
  bezel: "polished",
  dial: "midnight",
  indices: "baton",
  accent: "red",
  strap: "tan",
  size: "38",
};

export const GROUPS = {
  case: CASES,
  bezel: BEZELS,
  dial: DIALS,
  indices: INDICES,
  accent: ACCENTS,
  strap: STRAPS,
  size: SIZES,
} as const;

export function pick<K extends keyof WatchConfig>(key: K, id: WatchConfig[K]) {
  const list = GROUPS[key] as readonly Option[];
  return list.find((o) => o.id === id) ?? list[0];
}

export function priceOf(config: WatchConfig) {
  return (Object.keys(GROUPS) as (keyof WatchConfig)[]).reduce(
    (sum, key) => sum + pick(key, config[key]).price,
    BASE_PRICE,
  );
}

export const formatPrice = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

/** Encodes a build into URL search params, e.g. ?case=rose&dial=salmon */
export function toSearch(config: WatchConfig) {
  const params = new URLSearchParams();
  (Object.keys(config) as (keyof WatchConfig)[]).forEach((k) => {
    if (config[k] !== DEFAULT_CONFIG[k]) params.set(k, config[k]);
  });
  const s = params.toString();
  return s ? `?${s}` : "";
}

/** Reads a build from URL search params, ignoring anything invalid. */
export function fromSearch(search: string): WatchConfig {
  const params = new URLSearchParams(search);
  const next = { ...DEFAULT_CONFIG };
  (Object.keys(GROUPS) as (keyof WatchConfig)[]).forEach((k) => {
    const v = params.get(k);
    const list = GROUPS[k] as readonly Option[];
    if (v && list.some((o) => o.id === v)) (next as Record<string, string>)[k] = v;
  });
  return next;
}
