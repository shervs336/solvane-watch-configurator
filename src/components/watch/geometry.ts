import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Procedural geometry for the watch. Everything is built from code, so there's
 * no 3D model to download or license.
 *
 * Units: 1 unit ≈ 1 cm. The dial faces +Z; 12 o'clock is +Y; the crown is at +X.
 */

/** Lathe (revolved profile) whose axis points at the viewer (+Z). */
function lathe(points: [number, number][], segments = 128) {
  const geo = new THREE.LatheGeometry(
    points.map(([r, z]) => new THREE.Vector2(r, z)),
    segments,
  );
  geo.rotateX(Math.PI / 2); // lathe Y axis → world Z
  return smooth(geo);
}

/** Welds the seam where a lathe meets itself, then recomputes normals so there's no visible line. */
function smooth(geo: THREE.BufferGeometry) {
  geo.deleteAttribute("uv");
  geo.deleteAttribute("normal");
  const merged = mergeVertices(geo, 1e-4);
  merged.computeVertexNormals();
  return merged;
}

export function caseGeometry() {
  return lathe([
    [0, -0.5],
    [1.45, -0.5],
    [1.7, -0.47],
    [1.86, -0.38],
    [1.95, -0.2],
    [1.98, 0],
    [1.96, 0.16],
    [1.9, 0.28],
    [1.82, 0.34],
    [1.62, 0.34],
    [1.62, 0.18],
  ]);
}

export function bezelGeometry(fluted: boolean) {
  const segments = fluted ? 1080 : 160;
  const geo = lathe(
    [
      [1.6, 0.33],
      [1.63, 0.44],
      [1.69, 0.5],
      [1.8, 0.5],
      [1.87, 0.45],
      [1.9, 0.37],
      [1.88, 0.33],
    ],
    segments,
  );
  if (fluted) {
    // Push the outer slope in and out around the ring to cut 60 flutes.
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const r = Math.hypot(v.x, v.y);
      if (r < 1.7) continue;
      const angle = Math.atan2(v.y, v.x);
      const weight = Math.min(1, (r - 1.7) / 0.1);
      // Triangle wave → sharp ridges with V-shaped grooves between them.
      const phase = (angle * 90) / (Math.PI * 2);
      const tri = Math.abs(phase - Math.round(phase)) * 2; // 0 at ridge, 1 at groove
      const nr = r - 0.032 * weight * tri;
      v.x *= nr / r;
      v.y *= nr / r;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
  }
  // lathe() already welded the seam, so recomputing normals here stays smooth.
  return geo;
}

export function casebackRingsGeometry() {
  return [0.75, 1.05, 1.3].map((r) => {
    const g = new THREE.TorusGeometry(r, 0.012, 8, 96);
    g.translate(0, 0, -0.505);
    return g;
  });
}

/** Sword-shaped hand pointing +Y from the pivot. */
export function handGeometry(length: number, width: number, tail = 0.18) {
  const s = new THREE.Shape();
  s.moveTo(0, -tail);
  s.lineTo(width * 0.45, -tail + 0.05);
  s.lineTo(width / 2, length * 0.72);
  s.lineTo(0, length);
  s.lineTo(-width / 2, length * 0.72);
  s.lineTo(-width * 0.45, -tail + 0.05);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 2,
  });
  geo.computeVertexNormals();
  return geo;
}

/** Points along one side of the strap, starting at the lug and curving back around the wrist. */
export function strapCurve(direction: 1 | -1) {
  const d = direction;
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 2.3 * d, -0.12),
    new THREE.Vector3(0, 3.05 * d, -0.32),
    new THREE.Vector3(0, 3.7 * d, -0.85),
    new THREE.Vector3(0, 4.1 * d, -1.7),
    new THREE.Vector3(0, 4.2 * d, -2.6),
  ]);
}

/**
 * A flat band swept along a curve (the strap). Width runs along X; thickness
 * along the curve's normal. Built by hand so the band never twists.
 */
export function bandGeometry(curve: THREE.Curve<THREE.Vector3>, width: number, thickness: number, taper = 0.12) {
  const steps = 64;
  const X = new THREE.Vector3(1, 0, 0);
  const positions: number[] = [];
  const indices: number[] = [];
  const p = new THREE.Vector3();
  const t = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    curve.getPointAt(u, p);
    curve.getTangentAt(u, t);
    n.crossVectors(X, t).normalize(); // points away from the wrist
    const w = (width * (1 - taper * u)) / 2;
    const h = thickness / 2;
    // 4 corners: top-left, top-right, bottom-right, bottom-left
    for (const [sx, sn] of [[-1, 1], [1, 1], [1, -1], [-1, -1]] as const) {
      positions.push(p.x + X.x * w * sx + n.x * h * sn, p.y + n.y * h * sn, p.z + n.z * h * sn);
    }
  }
  for (let i = 0; i < steps; i++) {
    const a = i * 4;
    const b = (i + 1) * 4;
    for (let side = 0; side < 4; side++) {
      const s0 = side;
      const s1 = (side + 1) % 4;
      indices.push(a + s0, b + s0, b + s1, a + s0, b + s1, a + s1);
    }
  }
  // End cap
  const e = steps * 4;
  indices.push(e, e + 1, e + 2, e, e + 2, e + 3);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Position + orientation for something sitting on the strap surface at u (0..1). */
export function frameOnCurve(curve: THREE.Curve<THREE.Vector3>, u: number, lift: number, x = 0) {
  const p = curve.getPointAt(u);
  const t = curve.getTangentAt(u);
  const X = new THREE.Vector3(1, 0, 0);
  const n = new THREE.Vector3().crossVectors(X, t).normalize();
  const m = new THREE.Matrix4().makeBasis(X, t, n);
  const q = new THREE.Quaternion().setFromRotationMatrix(m);
  p.addScaledVector(n, lift).add(new THREE.Vector3(x, 0, 0));
  return { position: p, quaternion: q };
}
