import * as THREE from "three";

const cache = new Map<string, THREE.CanvasTexture>();

/**
 * A "sunray" dial: fine rays radiating from the center plus a darker edge
 * (fumé), drawn on a canvas so it costs no image download.
 */
export function sunrayTexture(base: string) {
  const hit = cache.get(base);
  if (hit) return hit;

  const size = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const mid = size / 2;

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // Rays
  const rays = ctx.createConicGradient(0, mid, mid);
  const count = 180;
  for (let i = 0; i <= count; i++) {
    const light = i % 2 === 0;
    rays.addColorStop(i / count, light ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)");
  }
  ctx.fillStyle = rays;
  ctx.fillRect(0, 0, size, size);

  // Broad sheen: two light lobes, like light catching brushed metal
  const sheen = ctx.createConicGradient(-Math.PI / 4, mid, mid);
  sheen.addColorStop(0, "rgba(255,255,255,0.16)");
  sheen.addColorStop(0.18, "rgba(255,255,255,0)");
  sheen.addColorStop(0.5, "rgba(255,255,255,0.12)");
  sheen.addColorStop(0.68, "rgba(255,255,255,0)");
  sheen.addColorStop(1, "rgba(255,255,255,0.16)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, size, size);

  // Fumé edge
  const edge = ctx.createRadialGradient(mid, mid, size * 0.18, mid, mid, mid);
  edge.addColorStop(0, "rgba(0,0,0,0)");
  edge.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  cache.set(base, tex);
  return tex;
}
