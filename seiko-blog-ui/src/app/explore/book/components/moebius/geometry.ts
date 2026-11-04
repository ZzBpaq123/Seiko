import * as THREE from "three";

// 莫比乌斯带几何参数
const R = 1.05;
const W = 0.32;
const SEGMENTS_U = 33;
const SEGMENTS_V = 6;

// 莫比乌斯带参数化方程：绕一整圈时带子翻转 180°（方向向量用半角 t/2 控制）
function point(u: number, v: number, target: THREE.Vector3) {
  const t = u * Math.PI * 2;
  const s = (v - 0.5) * 2 * W;
  const halfT = t / 2;

  const x = (R + s * Math.cos(halfT)) * Math.cos(t);
  const y = (R + s * Math.cos(halfT)) * Math.sin(t);
  const z = s * Math.sin(halfT);
  target.set(x, y, z);
}

function createMobiusGrid(): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < SEGMENTS_U; i++) {
    const u = i / SEGMENTS_U;
    for (let j = 0; j < SEGMENTS_V; j++) {
      const v = j / (SEGMENTS_V - 1);
      const p = new THREE.Vector3();
      point(u, v, p);
      points.push(p);
    }
  }
  return points;
}

// 线框：宽度横线 + 长度竖线 + 首尾缝合线（末尾 v 与开头 vCount-1-v 相连以闭合扭转）
export function createMobiusLineGeometry() {
  const points = createMobiusGrid();
  const positions: number[] = [];

  for (let i = 0; i < SEGMENTS_U; i++) {
    for (let j = 0; j < SEGMENTS_V - 1; j++) {
      const a = points[i * SEGMENTS_V + j];
      const b = points[i * SEGMENTS_V + j + 1];
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }

  for (let i = 0; i < SEGMENTS_U - 1; i++) {
    for (let j = 0; j < SEGMENTS_V; j++) {
      const a = points[i * SEGMENTS_V + j];
      const b = points[(i + 1) * SEGMENTS_V + j];
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }

  for (let j = 0; j < SEGMENTS_V; j++) {
    const a = points[(SEGMENTS_U - 1) * SEGMENTS_V + j];
    const b = points[SEGMENTS_V - 1 - j];
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  return geometry;
}

// 表面：每个网格四边形拆成两个三角形，首尾缝合处同样做 v 索引反转
export function createMobiusSurfaceGeometry() {
  const points = createMobiusGrid();
  const positions: number[] = [];

  const pushTriangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  };
  const idx = (i: number, j: number) => i * SEGMENTS_V + j;

  for (let i = 0; i < SEGMENTS_U - 1; i++) {
    for (let j = 0; j < SEGMENTS_V - 1; j++) {
      const a = points[idx(i, j)];
      const b = points[idx(i, j + 1)];
      const c = points[idx(i + 1, j)];
      const d = points[idx(i + 1, j + 1)];
      pushTriangle(a, b, c);
      pushTriangle(b, d, c);
    }
  }

  for (let j = 0; j < SEGMENTS_V - 1; j++) {
    const a = points[idx(SEGMENTS_U - 1, j)];
    const b = points[idx(SEGMENTS_U - 1, j + 1)];
    const c = points[idx(0, SEGMENTS_V - 1 - j)];
    const d = points[idx(0, SEGMENTS_V - 2 - j)];
    pushTriangle(a, b, c);
    pushTriangle(b, d, c);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  return geometry;
}

// 背景星点：球体内随机撒点，越靠边缘越稀疏、点越小
export function createBackgroundDotGeometry(count = 2000) {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const range = 10;

  let i = 0;
  while (i < count) {
    const x = (Math.random() * 2 - 1) * range;
    const y = (Math.random() * 2 - 1) * range;
    const z = (Math.random() * 2 - 1) * range;

    const r = Math.sqrt(x * x + y * y + z * z);
    if (r > range) continue;

    const edge = r / range;
    if (Math.random() > 1 - edge * edge) continue;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    sizes[i] = 0.012 * (1 - 0.5 * edge) + 0.004;
    i++;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  return geometry;
}

// 强调点缀：围绕莫比乌斯带中心线法向平面散落一圈稍大的点
export function createAccentDotGeometry(count = 120) {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const center = new THREE.Vector3();
  const radial = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    const u = i / count;
    const t = u * Math.PI * 2;
    const halfT = t / 2;
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);
    const cosHT = Math.cos(halfT);
    const sinHT = Math.sin(halfT);

    center.set(R * cosT, R * sinT, 0);
    radial.set(cosT, sinT, 0);
    normal.set(cosHT * cosT, cosHT * sinT, sinHT);

    const r = W + 0.4 + Math.random() * 0.4;
    const angle = Math.random() * Math.PI * 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    positions[i * 3] = center.x + r * (radial.x * cosA + normal.x * sinA);
    positions[i * 3 + 1] = center.y + r * (radial.y * cosA + normal.y * sinA);
    positions[i * 3 + 2] = center.z + r * (radial.z * cosA + normal.z * sinA);

    sizes[i] = 0.01 + Math.random() * 0.02;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  return geometry;
}
