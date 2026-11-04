"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  createAccentDotGeometry,
  createBackgroundDotGeometry,
  createMobiusLineGeometry,
  createMobiusSurfaceGeometry,
} from "./geometry";
import DotField from "./DotField";

interface MoebiusStripProps {
  scrollBoost?: number;
  reducedMotion?: boolean;
  isDark?: boolean;
}

// 按主题区分的一套配色（浅色：琥珀米白底 + 黑色线框；深色：近黑底 + 浅琥珀线框）
const PALETTE = {
  light: {
    surface: "#fffbeb",
    wireframe: "#000000",
    dot: [0.35, 0.2, 0.03],
  },
  dark: {
    surface: "#461901",
    wireframe: "#fcd34d",
    dot: [0.99, 0.85, 0.6],
  },
} as const;

export default function MoebiusStrip({
  scrollBoost = 0,
  reducedMotion = false,
  isDark = false,
}: MoebiusStripProps) {
  const groupRef = useRef<THREE.Group>(null);
  const boostRef = useRef(scrollBoost);
  const entranceRef = useRef(reducedMotion ? 1 : 0);

  const palette = isDark ? PALETTE.dark : PALETTE.light;

  const lineGeometry = useMemo(() => createMobiusLineGeometry(), []);
  const surfaceGeometry = useMemo(() => createMobiusSurfaceGeometry(), []);
  const backgroundDotGeometry = useMemo(() => createBackgroundDotGeometry(), []);
  const accentDotGeometry = useMemo(() => createAccentDotGeometry(), []);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    boostRef.current += (scrollBoost - boostRef.current) * 0.08;
    entranceRef.current = Math.min(1, entranceRef.current + delta / 2.2);

    if (!reducedMotion) {
      group.rotation.z += delta * (0.1 + boostRef.current * 1.2);
      group.rotation.y += delta * (0.08 + boostRef.current * 0.3);
    }

    // 入场缓动（easeOutQuad）与滚动增益叠加到整体缩放
    const t = entranceRef.current;
    const ease = 1 - (1 - t) * (1 - t);
    group.scale.setScalar(Math.max(0.01, ease) * (1 + boostRef.current * 0.06));
  });

  return (
    <group ref={groupRef} rotation={[Math.PI / 2.5, 0, 0]}>
      {/* 表面：填充色与页面背景一致，形成"镂空纸雕"感 */}
      <mesh geometry={surfaceGeometry}>
        <meshBasicMaterial
          color={palette.surface}
          side={THREE.DoubleSide}
          polygonOffset
          polygonOffsetFactor={1}
          polygonOffsetUnits={1}
        />
      </mesh>
      {/* 线框：勾勒莫比乌斯带轮廓，绘制在表面之上 */}
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial
          color={palette.wireframe}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </lineSegments>
      {/* 粒子点阵（背景星点 + 强调点缀） */}
      <DotField
        backgroundGeometry={backgroundDotGeometry}
        accentGeometry={accentDotGeometry}
        dotColor={palette.dot}
        reducedMotion={reducedMotion}
      />
    </group>
  );
}
