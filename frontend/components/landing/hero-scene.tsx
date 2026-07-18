"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const GREEN = new THREE.Color("#39ff88");
const CYAN = new THREE.Color("#38d6ff");

/** An undulating grid of points — a "live market surface". */
function WaveField() {
  const ref = useRef<THREE.Points>(null);
  const NX = 58;
  const NZ = 58;
  const SEP = 0.34;

  const { positions, colors, base } = useMemo(() => {
    const positions = new Float32Array(NX * NZ * 3);
    const colors = new Float32Array(NX * NZ * 3);
    const base = new Float32Array(NX * NZ * 2);
    let i = 0;
    const c = new THREE.Color();
    for (let ix = 0; ix < NX; ix++) {
      for (let iz = 0; iz < NZ; iz++) {
        const x = (ix - NX / 2) * SEP;
        const z = (iz - NZ / 2) * SEP;
        positions[i * 3] = x;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = z;
        base[i * 2] = x;
        base[i * 2 + 1] = z;
        c.copy(GREEN).lerp(CYAN, ix / NX);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
        i++;
      }
    }
    return { positions, colors, base };
  }, []);

  useFrame((state) => {
    const pts = ref.current;
    if (!pts) return;
    const t = state.clock.elapsedTime;
    const attr = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < base.length / 2; i++) {
      const x = base[i * 2];
      const z = base[i * 2 + 1];
      const y =
        Math.sin(x * 0.6 + t * 0.9) * 0.32 +
        Math.cos(z * 0.5 - t * 0.7) * 0.3 +
        Math.sin((x + z) * 0.3 + t * 0.5) * 0.18;
      arr[i * 3 + 1] = y;
    }
    attr.needsUpdate = true;
    pts.rotation.y = t * 0.04;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.065}
        vertexColors
        transparent
        opacity={0.9}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Sparse upward-drifting sparks for depth. */
function Sparks() {
  const ref = useRef<THREE.Points>(null);
  const COUNT = 90;
  const positions = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 16;
      arr[i * 3 + 1] = Math.random() * 8 - 1;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    return arr;
  }, []);

  useFrame((_, delta) => {
    const pts = ref.current;
    if (!pts) return;
    const attr = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 1] += delta * 0.35;
      if (arr[i * 3 + 1] > 7) arr[i * 3 + 1] = -1;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#7cf5c0"
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** Gentle camera parallax following the pointer. */
function Rig() {
  const { camera } = useThree();
  useFrame((state) => {
    const px = state.pointer.x;
    const py = state.pointer.y;
    camera.position.x += (px * 1.6 - camera.position.x) * 0.03;
    camera.position.y += (2.8 - py * 1.0 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 2.8, 6.2], fov: 52 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <WaveField />
      <Sparks />
      <Rig />
    </Canvas>
  );
}
