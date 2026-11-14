"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";

const WATCH_ROOT = "watch-root";
import { CameraControls, ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { Watch } from "@/components/watch/watch";
import type { WatchConfig } from "@/lib/config";
import { VIEW_POSES, type SceneApi, type ViewId } from "@/lib/views";

function Rig({ apiRef, onInteract, ready }: { apiRef: Ref<SceneApi>; onInteract: () => void; ready: boolean }) {
  const controls = useRef<CameraControls>(null);
  const { gl, size } = useThree();
  // On tall/narrow screens, step the camera back so the whole watch fits.
  const fit = size.width / size.height < 0.9 ? 1.45 : 1;

  const go = (id: ViewId, animate = true) => {
    const [p, t] = VIEW_POSES[id];
    controls.current?.setLookAt(p[0] * fit, p[1] * fit, p[2] * fit, t[0], t[1], t[2], animate);
  };

  useImperativeHandle(apiRef, () => ({
    setView: (id) => go(id),
    capture: () => gl.domElement.toDataURL("image/png"),
  }));

  useEffect(() => {
    // Start further out, then glide into the hero view once the watch is ready to show.
    const [p, t] = VIEW_POSES.hero;
    controls.current?.setLookAt(p[0] * 1.8 * fit, p[1] * 2, p[2] * 1.8 * fit, t[0], t[1], t[2], false);
    if (!ready) return;
    const id = requestAnimationFrame(() => go("hero"));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fit, ready]);

  return (
    <CameraControls
      ref={controls}
      makeDefault
      minDistance={5}
      maxDistance={30}
      smoothTime={0.6}
      onStart={onInteract}
    />
  );
}

/**
 * Compiles every shader in parallel before the watch is first drawn.
 * Without this, the first frame compiles ~a dozen GPU programs synchronously and
 * freezes the page for over a second. The watch stays hidden for the couple of
 * frames the studio lighting needs, then is compiled with KHR_parallel_shader_compile.
 */
function Warmup({ onReady }: { onReady: () => void }) {
  const frame = useRef(0);
  const started = useRef(false);
  useFrame(({ gl, scene, camera }) => {
    frame.current++;
    const group = scene.getObjectByName(WATCH_ROOT);
    if (started.current || !group || frame.current < 3) return;
    started.current = true;
    group.visible = true;
    const compiling = gl.compileAsync(scene, camera); // collects programs synchronously
    group.visible = false;
    compiling.then(() => {
      group.visible = true;
      onReady();
    });
  });
  return null;
}

export default function Scene({
  config,
  apiRef,
  onInteract = () => {},
}: {
  config: WatchConfig;
  apiRef: Ref<SceneApi>;
  onInteract?: () => void;
}) {
  const [ready, setReady] = useState(false);

  return (
    <>
    {!ready && (
      <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
        <div className="flex flex-col items-center gap-3 text-sm text-ink-soft">
          <span className="size-10 animate-spin rounded-full border-2 border-ink/10 border-t-brass" />
          Polishing the case…
        </div>
      </div>
    )}
    <Canvas
      dpr={[1, 2]}
      shadows={false}
      camera={{ fov: 30, position: [9, 4, 16], near: 0.1, far: 100 }}
      gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
      aria-label="Interactive 3D watch. Drag to rotate, scroll or pinch to zoom."
      role="img"
      style={{ opacity: ready ? 1 : 0, transition: "opacity 0.6s ease" }}
    >
      <Warmup onReady={() => setReady(true)} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 6, 8]} intensity={1.1} />
      <directionalLight position={[-6, 2, -4]} intensity={0.5} color="#ffe9d6" />

      {/* Studio lighting, generated in code (no HDR download) */}
      {/* A dark room with a few softboxes: metal needs dark areas to reflect, or it reads as grey plastic. */}
      <Environment resolution={256} frames={1}>
        <color attach="background" args={["#4a433b"]} />
        <Lightformer form="rect" intensity={4} position={[0, 6, 5]} rotation-x={Math.PI / 3} scale={[16, 4, 1]} />
        <Lightformer form="rect" intensity={3} position={[-7, 1.5, 2]} rotation-y={Math.PI / 2.2} scale={[4, 12, 1]} />
        <Lightformer form="rect" intensity={2.4} color="#fff0de" position={[7, 0, 3]} rotation-y={-Math.PI / 2.2} scale={[4, 12, 1]} />
        <Lightformer form="rect" intensity={2.5} position={[0, 2, -8]} scale={[14, 6, 1]} />
        <Lightformer form="ring" intensity={4} position={[3, 4, -7]} scale={2.5} />
        <Lightformer form="rect" intensity={1.6} color="#f3e6d6" position={[0, -6, 2]} rotation-x={-Math.PI / 2} scale={[12, 6, 1]} />
        <Lightformer form="circle" intensity={2.5} position={[-3, -2, 8]} scale={2} />
      </Environment>

      <group name={WATCH_ROOT} position={[0, 0.2, 0]} visible={ready}>
        <Watch config={config} />
      </group>

      {/* Rendered once per shape change instead of every frame (the silhouette only changes with strap type and size). */}
      <ContactShadows
        key={`${ready}-${config.strap === "bracelet"}-${config.size}`}
        frames={1}
        position={[0, -4.75, 0]}
        opacity={0.38}
        scale={14}
        blur={2.6}
        far={6}
        resolution={512}
        color="#4a3a28"
      />

      <Rig apiRef={apiRef} onInteract={onInteract} ready={ready} />
    </Canvas>
    </>
  );
}
