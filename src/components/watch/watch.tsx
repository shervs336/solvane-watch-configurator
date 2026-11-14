"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { ACCENTS, CASES, DIALS, SIZES, STRAPS, type WatchConfig } from "@/lib/config";
import {
  bandGeometry,
  bezelGeometry,
  caseGeometry,
  casebackRingsGeometry,
  frameOnCurve,
  handGeometry,
  strapCurve,
} from "./geometry";
import { sunrayTexture } from "./dial-texture";

const TAU = Math.PI * 2;

function luminance(hex: string) {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

export function Watch({ config }: { config: WatchConfig }) {
  const metalDef = CASES.find((c) => c.id === config.case) ?? CASES[0];
  const dialDef = DIALS.find((d) => d.id === config.dial) ?? DIALS[0];
  const strapDef = STRAPS.find((s) => s.id === config.strap) ?? STRAPS[0];
  const accentDef = ACCENTS.find((a) => a.id === config.accent) ?? ACCENTS[0];
  const scale = (SIZES.find((s) => s.id === config.size) ?? SIZES[1]).scale;

  const metal = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: metalDef.color,
        roughness: metalDef.roughness,
        metalness: metalDef.metalness,
        envMapIntensity: 1.25,
      }),
    [metalDef],
  );
  const brushed = useMemo(() => {
    const m = metal.clone();
    m.roughness = Math.min(0.55, metalDef.roughness + 0.22);
    return m;
  }, [metal, metalDef]);

  const lightDial = luminance(dialDef.swatch) > 0.45;
  const printColor = lightDial ? "#2a2a2a" : "#f1efe9";

  const geos = useMemo(
    () => ({
      case: caseGeometry(),
      bezelSmooth: bezelGeometry(false),
      bezelFluted: bezelGeometry(true),
      casebackRings: casebackRingsGeometry(),
      hour: handGeometry(0.95, 0.12, 0.1),
      minute: handGeometry(1.38, 0.09, 0.1),
      lug: new RoundedBoxGeometry(0.34, 0.95, 0.5, 4, 0.1),
    }),
    [],
  );

  return (
    <group scale={scale}>
      {/* Case */}
      <mesh geometry={geos.case} material={metal} castShadow />

      {/* Bezel */}
      <mesh geometry={config.bezel === "fluted" ? geos.bezelFluted : geos.bezelSmooth} material={metal} />
      {(config.bezel === "noir" || config.bezel === "bleu") && <CeramicInsert color={config.bezel === "noir" ? "#121214" : "#1b3160"} />}

      {/* Lugs */}
      {[
        [-1, 1],
        [1, 1],
        [-1, -1],
        [1, -1],
      ].map(([sx, sy]) => (
        <mesh
          key={`${sx}${sy}`}
          geometry={geos.lug}
          material={metal}
          position={[sx * 1.02, sy * 1.92, -0.1]}
          rotation={[sy * -0.2, 0, 0]}
        />
      ))}

      {/* Crown */}
      <Crown material={metal} />

      {/* Dial */}
      <Dial color={dialDef.swatch} printColor={printColor} metal={metal} indices={config.indices} />

      {/* Hands */}
      <Hands
        metal={metal}
        hourGeo={geos.hour}
        minuteGeo={geos.minute}
        accent={accentDef.id === "metal" ? metalDef.color : accentDef.swatch}
        accentIsMetal={accentDef.id === "metal"}
      />

      {/* Crystal */}
      <mesh position={[0, 0, 0.47]}>
        <circleGeometry args={[1.62, 96]} />
        <meshPhysicalMaterial color="#ffffff" transparent opacity={0.08} roughness={0} metalness={0} clearcoat={1} envMapIntensity={2} />
      </mesh>

      {/* Caseback detail */}
      {geos.casebackRings.map((g, i) => (
        <mesh key={i} geometry={g} material={brushed} />
      ))}
      <mesh position={[0, 0, -0.506]} rotation={[0, Math.PI, 0]} material={brushed}>
        <circleGeometry args={[0.5, 64]} />
      </mesh>

      {/* Strap / bracelet */}
      {strapDef.kind === "bracelet" ? (
        <Bracelet metal={metal} brushed={brushed} />
      ) : (
        <Strap color={strapDef.swatch} kind={strapDef.kind} />
      )}
    </group>
  );
}

function CeramicInsert({ color }: { color: string }) {
  const ticks = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);
  return (
    <group position={[0, 0, 0.503]}>
      <mesh>
        <ringGeometry args={[1.665, 1.83, 160]} />
        <meshPhysicalMaterial color={color} roughness={0.12} metalness={0.1} clearcoat={1} clearcoatRoughness={0.05} />
      </mesh>
      {ticks.map((i) => {
        const a = (i / 60) * TAU;
        const major = i % 5 === 0;
        if (i === 0) return null;
        return (
          <mesh key={i} position={[Math.sin(a) * 1.75, Math.cos(a) * 1.75, 0.002]} rotation={[0, 0, -a]}>
            <planeGeometry args={[major ? 0.025 : 0.012, major ? 0.1 : 0.05]} />
            <meshBasicMaterial color="#e9e6dd" />
          </mesh>
        );
      })}
      {/* Lume pip at 12 */}
      <mesh position={[0, 1.76, 0.01]} rotation={[0, 0, Math.PI]}>
        <circleGeometry args={[0.05, 3]} />
        <meshStandardMaterial color="#f3f6e8" emissive="#cfe8b0" emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}

function Crown({ material }: { material: THREE.Material }) {
  const ribs = useMemo(() => Array.from({ length: 24 }, (_, i) => (i / 24) * TAU), []);
  return (
    <group position={[2.1, 0, -0.02]} rotation={[0, 0, Math.PI / 2]}>
      <mesh material={material} position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.2, 24]} />
      </mesh>
      <mesh material={material} position={[0, -0.08, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.26, 48]} />
      </mesh>
      {ribs.map((a) => (
        <mesh key={a} material={material} position={[Math.cos(a) * 0.222, -0.08, Math.sin(a) * 0.222]} rotation={[0, -a, 0]}>
          <boxGeometry args={[0.02, 0.22, 0.03]} />
        </mesh>
      ))}
    </group>
  );
}

function Dial({
  color,
  printColor,
  metal,
  indices,
}: {
  color: string;
  printColor: string;
  metal: THREE.Material;
  indices: WatchConfig["indices"];
}) {
  const map = useMemo(() => sunrayTexture(color), [color]);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i).filter((i) => i % 5 !== 0), []);
  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);

  return (
    <group position={[0, 0, 0.2]}>
      <mesh>
        <circleGeometry args={[1.63, 128]} />
        <meshStandardMaterial map={map} roughness={0.38} metalness={0.35} envMapIntensity={0.9} />
      </mesh>

      {/* Printed minute track */}
      {minutes.map((i) => {
        const a = (i / 60) * TAU;
        return (
          <mesh key={i} position={[Math.sin(a) * 1.5, Math.cos(a) * 1.5, 0.002]} rotation={[0, 0, -a]}>
            <planeGeometry args={[0.012, 0.07]} />
            <meshBasicMaterial color={printColor} transparent opacity={0.75} />
          </mesh>
        );
      })}

      {/* Applied hour markers */}
      {hours.map((h) => {
        const a = (h / 12) * TAU;
        const r = 1.23;
        const pos: [number, number, number] = [Math.sin(a) * r, Math.cos(a) * r, 0.025];
        if (indices === "dot") {
          return (
            <group key={h} position={pos}>
              <mesh material={metal} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[h === 0 ? 0.1 : 0.075, h === 0 ? 0.1 : 0.075, 0.05, 32]} />
              </mesh>
              <mesh position={[0, 0, 0.027]}>
                <circleGeometry args={[h === 0 ? 0.07 : 0.05, 32]} />
                <meshStandardMaterial color="#f2f4ea" emissive="#d6ecb9" emissiveIntensity={0.15} roughness={0.6} />
              </mesh>
            </group>
          );
        }
        const pair = h === 0 ? [-0.06, 0.06] : [0];
        return pair.map((dx) => (
          <group key={`${h}${dx}`} position={pos} rotation={[0, 0, -a]}>
            <mesh material={metal} position={[dx, 0, 0]}>
              <boxGeometry args={[0.075, 0.32, 0.05]} />
            </mesh>
            <mesh position={[dx, 0, 0.026]}>
              <planeGeometry args={[0.03, 0.24]} />
              <meshStandardMaterial color="#f2f4ea" emissive="#d6ecb9" emissiveIntensity={0.15} roughness={0.6} />
            </mesh>
          </group>
        ));
      })}

      {/* Applied logo + printed text lines */}
      <mesh material={metal} position={[0, 0.78, 0.02]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.09, 0.09, 0.03]} />
      </mesh>
      <mesh position={[0, 0.6, 0.002]}>
        <planeGeometry args={[0.36, 0.035]} />
        <meshBasicMaterial color={printColor} />
      </mesh>
      <mesh position={[0, -0.62, 0.002]}>
        <planeGeometry args={[0.28, 0.025]} />
        <meshBasicMaterial color={printColor} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, -0.7, 0.002]}>
        <planeGeometry args={[0.2, 0.02]} />
        <meshBasicMaterial color={printColor} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

function Hands({
  metal,
  hourGeo,
  minuteGeo,
  accent,
  accentIsMetal,
}: {
  metal: THREE.Material;
  hourGeo: THREE.BufferGeometry;
  minuteGeo: THREE.BufferGeometry;
  accent: string;
  accentIsMetal: boolean;
}) {
  const hour = useRef<THREE.Group>(null);
  const minute = useRef<THREE.Group>(null);
  const second = useRef<THREE.Group>(null);

  // Shows the visitor's real local time, with a smooth automatic sweep.
  useFrame(() => {
    const d = new Date();
    const s = d.getSeconds() + d.getMilliseconds() / 1000;
    const m = d.getMinutes() + s / 60;
    const h = (d.getHours() % 12) + m / 60;
    if (second.current) second.current.rotation.z = -(s / 60) * TAU;
    if (minute.current) minute.current.rotation.z = -(m / 60) * TAU;
    if (hour.current) hour.current.rotation.z = -(h / 12) * TAU;
  });

  return (
    <group position={[0, 0, 0.27]}>
      <group ref={hour}>
        <mesh geometry={hourGeo} material={metal} />
      </group>
      <group ref={minute} position={[0, 0, 0.04]}>
        <mesh geometry={minuteGeo} material={metal} />
      </group>
      <group ref={second} position={[0, 0, 0.08]}>
        <mesh position={[0, 0.55, 0]}>
          <boxGeometry args={[0.018, 1.45, 0.012]} />
          <meshStandardMaterial color={accent} metalness={accentIsMetal ? 1 : 0.2} roughness={accentIsMetal ? 0.2 : 0.4} />
        </mesh>
        <mesh position={[0, 1.12, 0.008]}>
          <circleGeometry args={[0.04, 24]} />
          <meshStandardMaterial color="#f2f4ea" emissive="#d6ecb9" emissiveIntensity={0.2} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.03, 32]} />
          <meshStandardMaterial color={accent} metalness={accentIsMetal ? 1 : 0.2} roughness={0.35} />
        </mesh>
      </group>
      <mesh material={metal} position={[0, 0, 0.11]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.03, 24]} />
      </mesh>
    </group>
  );
}

function Strap({ color, kind }: { color: string; kind: "leather" | "rubber" }) {
  const thickness = kind === "rubber" ? 0.26 : 0.2;
  const curves = useMemo(() => [strapCurve(1), strapCurve(-1)], []);
  const geos = useMemo(() => curves.map((c) => bandGeometry(c, 1.72, thickness)), [curves, thickness]);

  return (
    <group>
      {geos.map((g, i) => (
        <mesh key={i} geometry={g} castShadow>
          <meshPhysicalMaterial
            color={color}
            roughness={kind === "rubber" ? 0.7 : 0.55}
            sheen={kind === "leather" ? 0.6 : 0}
            sheenRoughness={0.6}
            clearcoat={kind === "leather" ? 0.15 : 0}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {kind === "leather" && curves.map((c, i) => <Stitches key={i} curve={c} lift={thickness / 2 + 0.002} />)}
    </group>
  );
}

function Stitches({ curve, lift }: { curve: THREE.Curve<THREE.Vector3>; lift: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const perSide = 34;
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    let i = 0;
    for (const x of [-0.72, 0.72]) {
      for (let k = 0; k < perSide; k++) {
        const u = 0.03 + (k / perSide) * 0.94;
        const { position, quaternion } = frameOnCurve(curve, u, lift, x * (1 - 0.12 * u));
        m.compose(position, quaternion, new THREE.Vector3(1, 1, 1));
        mesh.setMatrixAt(i++, m);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [curve, lift]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, perSide * 2]}>
      <boxGeometry args={[0.022, 0.06, 0.01]} />
      <meshStandardMaterial color="#efe6d6" roughness={0.8} />
    </instancedMesh>
  );
}

function Bracelet({ metal, brushed }: { metal: THREE.Material; brushed: THREE.Material }) {
  const curves = useMemo(() => [strapCurve(1), strapCurve(-1)], []);
  const center = useMemo(() => new RoundedBoxGeometry(0.62, 0.3, 0.22, 3, 0.06), []);
  const outer = useMemo(() => new RoundedBoxGeometry(0.52, 0.3, 0.2, 3, 0.06), []);

  const links = useMemo(() => {
    const out: { key: string; position: THREE.Vector3; quaternion: THREE.Quaternion; x: number; c: boolean }[] = [];
    curves.forEach((curve, ci) => {
      const count = Math.floor(curve.getLength() / 0.33);
      for (let k = 0; k < count; k++) {
        const u = (k + 0.5) / count;
        const taper = 1 - 0.1 * u;
        for (const x of [-0.6 * taper, 0, 0.6 * taper]) {
          const { position, quaternion } = frameOnCurve(curve, u, 0, x);
          out.push({ key: `${ci}-${k}-${x}`, position, quaternion, x, c: x === 0 });
        }
      }
    });
    return out;
  }, [curves]);

  return (
    <group>
      {links.map((l) => (
        <mesh
          key={l.key}
          geometry={l.c ? center : outer}
          material={l.c ? metal : brushed}
          position={l.position}
          quaternion={l.quaternion}
          castShadow
        />
      ))}
    </group>
  );
}
