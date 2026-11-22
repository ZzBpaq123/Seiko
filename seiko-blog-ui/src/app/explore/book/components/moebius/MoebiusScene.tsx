"use client";

import { Component, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import MoebiusStrip from "./MoebiusStrip";

interface MoebiusSceneProps {
  scrollBoost?: number;
  reducedMotion?: boolean;
  isDark?: boolean;
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function MoebiusScene({
  scrollBoost = 0,
  reducedMotion = false,
  isDark = false,
}: MoebiusSceneProps) {
  const [supportsWebGL] = useState(() => {
    try {
      const context = document.createElement("canvas").getContext("webgl2");
      context?.getExtension("WEBGL_lose_context")?.loseContext();
      return Boolean(context);
    } catch {
      return false;
    }
  });
  if (!supportsWebGL) return null;

  return (
    <SceneBoundary>
      <Canvas
        camera={{ position: [0, 0, 4.6], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <MoebiusStrip
          scrollBoost={scrollBoost}
          reducedMotion={reducedMotion}
          isDark={isDark}
        />
      </Canvas>
    </SceneBoundary>
  );
}
