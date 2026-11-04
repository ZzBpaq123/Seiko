"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { DOT_FRAGMENT_SHADER, DOT_VERTEX_SHADER } from "./shaders";

interface DotFieldProps {
  backgroundGeometry: THREE.BufferGeometry;
  accentGeometry: THREE.BufferGeometry;
  dotColor: readonly [number, number, number];
  reducedMotion: boolean;
}

// 粒子点阵（背景星点 + 强调点缀），绕 Z 轴缓慢自转
export default function DotField({
  backgroundGeometry,
  accentGeometry,
  dotColor,
  reducedMotion,
}: DotFieldProps) {
  const { gl } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const ownAngle = useRef(0);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uScale: { value: 900.0 },
          uPixelRatio: { value: gl.getPixelRatio() },
          uFadeStart: { value: 18.0 },
          uFadeEnd: { value: 32.0 },
          uColor: { value: new THREE.Vector3(...dotColor) },
        },
        vertexShader: DOT_VERTEX_SHADER,
        fragmentShader: DOT_FRAGMENT_SHADER,
      }),
    [gl, dotColor],
  );
  const materialRef = useRef(material);

  useEffect(() => {
    materialRef.current = material;
  }, [material]);

  useFrame((_, delta) => {
    if (!groupRef.current || reducedMotion) return;
    materialRef.current.uniforms.uPixelRatio.value = gl.getPixelRatio();
    materialRef.current.uniforms.uColor.value.set(...dotColor);
    ownAngle.current -= 0.03 * delta;
    groupRef.current.rotation.z = ownAngle.current;
  });

  return (
    <group ref={groupRef}>
      <points geometry={backgroundGeometry} material={material} />
      <points geometry={accentGeometry} material={material} />
    </group>
  );
}
