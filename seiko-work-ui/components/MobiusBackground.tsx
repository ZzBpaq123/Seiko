"use client";

// ============================================================
// MobiusBackground —— 网页背景组件（3D 莫比乌斯带 + 星点阵 + 噪点叠加）
// 技术栈：
//   - React Three Fiber（@react-three/fiber）：在 React 中声明式使用 Three.js
//   - @react-three/drei：常用 Three.js 工具组件（此处用 OrbitControls 轨道控制器）
//   - GSAP：做入场缩放动画
// 渲染内容：
//   1. 一条半透明的莫比乌斯带（线框 + 表面）
//   2. 围绕莫比乌斯带的背景点阵与强调点缀（自定义着色器的粒子）
//   3. 一层 CSS 噪点遮罩，模拟纸张质感
// ============================================================
import {memo, useEffect, useMemo, useRef} from "react";
import {Canvas, useFrame, useThree} from "@react-three/fiber";
import {OrbitControls} from "@react-three/drei";
import {useTheme} from "next-themes";
import * as THREE from "three";
import gsap from "gsap";
import {useIsHome} from "@/hooks/useHash";

// ---------- 全局视觉常量 ----------
// 按主题区分的一套配色（浅色：纸雕米白底 + 深灰线框 + 黑点；深色：近黑底 + 浅灰线框 + 白点）
//
// 莫比乌斯环按"当前页面"分两档配色：
//   home    —— 首页：环是主视觉，保持原有对比度（不变）
//   content —— 其他页面（叠了内容面板）：降低环与背景的对比度，让它"退到背景里"不抢内容。
//              浅色主题把线框调浅、深色主题把环压暗，两者都是"变淡"。
const THEME_COLORS = {
    light: {
        // 背景清屏色（画布底色）：首页/内容页共用，避免切换页面时底色跳变
        background: "#FAFAF7",
        // 粒子点颜色（RGB 向量，供着色器 uniform 使用）：只随主题，与页面无关
        dot: [0.0, 0.0, 0.0],
        home: {
            // 莫比乌斯带表面的填充色（接近背景色，形成低对比的"纸雕"感）
            surface: "#FAFAF7",
            // 线框颜色（中灰，勾勒莫比乌斯带轮廓）
            wireframe: "#727478",
        },
        content: {
            // 表面更贴近背景、线框由中灰调浅为浅灰，整体对比度下降
            surface: "#FBFAF7",
            wireframe: "#B9BABE",
        },
    },
    dark: {
        background: "#0a0a0a",
        dot: [1.0, 1.0, 1.0],
        home: {
            surface: "#1a1a1a",
            wireframe: "#8b8b8b",
        },
        content: {
            // 深色主题下"变浅"= 降低对比度：环压暗、更贴近近黑底色
            surface: "#131313",
            wireframe: "#4a4a4a",
        },
    },
} as const;

type ThemeKey = keyof typeof THEME_COLORS;

// 当前生效主题（next-themes 的 resolvedTheme，system 时取系统实际值）
function useThemeKey(): ThemeKey {
    const {resolvedTheme} = useTheme();
    return resolvedTheme === "dark" ? "dark" : "light";
}

// 莫比乌斯环配色：首页用 home，其余页面（hash 非空）用 content（对比度更低）。
// 返回的是常量对象引用，可直接作为 useMemo / useEffect 的依赖。
function useRingPalette() {
    const theme = useThemeKey();
    const isHome = useIsHome();
    return THEME_COLORS[theme][isHome ? "home" : "content"];
}

// 背景星点颜色：只随主题变化，与当前页面无关
function useDotColor() {
    return THEME_COLORS[useThemeKey()].dot;
}

// ---------- 莫比乌斯带几何参数 ----------
// R   ：主圆环半径（莫比乌斯带中心线绕成的圆，位于 XY 平面）
const R = 1.5;
// w   ：带的宽度（沿法向的"半宽"，s 取值范围为 [-w, w]）
const w = 0.45;
// uCount：沿带子长度方向（绕圆一周）的采样段数
const uCount = 65;
// vCount：沿带子宽度方向的采样段数
const vCount = 10;

// ------------------------------------------------------------
// point(u, v, target)
// 根据参数化方程计算莫比乌斯带上 (u, v) 处的一个三维坐标点，写入 target。
//   u ∈ [0, 1]  —— 沿圆环一周的角度比例，实际角度 t = u * 2π
//   v ∈ [0, 1]  —— 沿带子宽度方向的比例，映射到 s = (v - 0.5) * 2w（中心为 0）
// 莫比乌斯带的关键特征：绕一整圈（t 从 0 到 2π）时，带子翻转 180°，
// 因此方向向量用 t/2（半角）来控制，这就是"半边扭转"的数学来源。
// ------------------------------------------------------------
function point(u: number, v: number, target: THREE.Vector3) {
    // t：绕主圆环的角度（弧度，0 ~ 2π）
    const t = u * Math.PI * 2;
    // s：带子宽度方向上的偏移量，中心线处为 0，向两侧各 w
    const s = (v - 0.5) * 2 * w;
    // halfT：t 的一半，用于实现莫比乌斯带的半扭转
    const halfT = t / 2;

    // 三个分量说明：
    // (R + s*cos(halfT)) 是点在主圆环上的"半径"（随带子上下摆动而变化）
    // x = 半径 * cos(t)  —— 沿 X 轴投影
    // y = 半径 * sin(t)  —— 沿 Y 轴投影
    // z = s * sin(halfT) —— 带子的上下摆动（Z 轴方向）
    const x = (R + s * Math.cos(halfT)) * Math.cos(t);
    const y = (R + s * Math.cos(halfT)) * Math.sin(t);
    const z = s * Math.sin(halfT);
    target.set(x, y, z);
}

// ------------------------------------------------------------
// createMobiusGrid()
// 对莫比乌斯带按 (uCount × vCount) 网格逐点采样，返回所有采样点的数组。
// 存储顺序：先固定 u（沿长度方向），再遍历 v（沿宽度方向），
// 即 points[i * vCount + j] 对应第 i 个 u、第 j 个 v 的点。
// ------------------------------------------------------------
function createMobiusGrid(): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < uCount; i++) {
        const u = i / uCount; // u 取 [0, 1)（不取 1，因为 1 与 0 重合）
        for (let j = 0; j < vCount; j++) {
            const v = j / (vCount - 1); // v 取 [0, 1]，含两端点
            const p = new THREE.Vector3();
            point(u, v, p);
            points.push(p);
        }
    }
    return points;
}

// ------------------------------------------------------------
// createMobiusLineGeometry()
// 用线段（LINE_SEGMENTS）勾勒莫比乌斯带的线框结构。
// 三组线段：
//   1. 宽度方向的横线（每组相邻 v 之间）
//   2. 长度方向的竖线（每组相邻 u 之间）
//   3. 首尾缝合线 —— 由于莫比乌斯带绕一圈后反转 180°，
//      末尾的 v 需要与开头的 (vCount-1-v) 相连才能正确闭合
// ------------------------------------------------------------
function createMobiusLineGeometry() {
    const points = createMobiusGrid();
    const positions: number[] = [];

    // 宽度方向横线：固定当前 u，连接相邻 v 的两点
    for (let i = 0; i < uCount; i++) {
        for (let j = 0; j < vCount - 1; j++) {
            const a = points[i * vCount + j];
            const b = points[i * vCount + j + 1];
            positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
    }

    // 长度方向竖线：固定当前 v，连接相邻 u 的两点
    for (let i = 0; i < uCount - 1; i++) {
        for (let j = 0; j < vCount; j++) {
            const a = points[i * vCount + j];
            const b = points[(i + 1) * vCount + j];
            positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
    }

    // 首尾缝合线：最后一列 u 与第一列 u 相连。
    // 因半扭转，最后一列的 v=j 应对接第一列的 v=vCount-1-j（v 索引反转），
    // 这样才能把带子"扭转着"闭合成一条莫比乌斯带。
    for (let j = 0; j < vCount; j++) {
        const a = points[(uCount - 1) * vCount + j];
        const b = points[vCount - 1 - j];
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }

    // 组装为 BufferGeometry，position 属性每个顶点占 3 个浮点数
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
    );
    return geometry;
}

// ------------------------------------------------------------
// createMobiusSurfaceGeometry()
// 用三角形面片填充莫比乌斯带的表面（非线框，形成实体的带面）。
// 每个网格四边形拆成两个三角形（a-b-c 与 b-d-c），
// 首尾缝合处同样做 v 索引反转来闭合。
// ------------------------------------------------------------
function createMobiusSurfaceGeometry() {
    const points = createMobiusGrid();
    const positions: number[] = [];

    // 便捷方法：把三角形三个顶点坐标依次压入 positions 数组
    const pushTriangle = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    };

    // 便捷方法：把网格坐标 (i, j) 换算为 points 数组下标
    const idx = (i: number, j: number) => i * vCount + j;

    // 内部四边形（不跨首尾）：每格拆成两个三角形
    for (let i = 0; i < uCount - 1; i++) {
        for (let j = 0; j < vCount - 1; j++) {
            const a = points[idx(i, j)];
            const b = points[idx(i, j + 1)];
            const c = points[idx(i + 1, j)];
            const d = points[idx(i + 1, j + 1)];
            pushTriangle(a, b, c);
            pushTriangle(b, d, c);
        }
    }

    // 首尾缝合四边形：最后一列 u 与第一列 u 之间补齐表面，
    // 同样按莫比乌斯半扭转规律把 v 索引反转后拼接。
    for (let j = 0; j < vCount - 1; j++) {
        const a = points[idx(uCount - 1, j)];
        const b = points[idx(uCount - 1, j + 1)];
        const c = points[idx(0, vCount - 1 - j)];
        const d = points[idx(0, vCount - 2 - j)];
        pushTriangle(a, b, c);
        pushTriangle(b, d, c);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
    );
    return geometry;
}

// ------------------------------------------------------------
// createBackgroundDotGeometry(count = 2500)
// 生成背景"星点"的粒子几何体：在半径 range 的球体内随机撒点，
// 越靠近球心密度越高、越靠近边缘越稀疏（配合平滑衰减），
// 点越靠边缘尺寸越小，用来营造纵深与星空般的层次感。
// 输出两个 attribute：position（xyz 坐标）与 size（每点大小）。
// ------------------------------------------------------------
function createBackgroundDotGeometry(count = 2000) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    // 使用足够大的球体范围，保证任意视角下背景都能铺满屏幕
    const range = 10;

    let i = 0;
    // 用 while 而非 for：随机撒点可能被剔除，只有成功落点的才计数
    while (i < count) {
        // 在 [-range, range]³ 的立方体内随机取一个点
        const x = (Math.random() * 2 - 1) * range;
        const y = (Math.random() * 2 - 1) * range;
        const z = (Math.random() * 2 - 1) * range;

        // 剔除立方体 8 个角上的点，让分布近似球体
        const r = Math.sqrt(x * x + y * y + z * z);
        if (r > range) continue;

        // 越靠近球体外缘（屏幕边缘）密度越低：以概率 (1 - edge²) 剔除，
        // 中心区域基本保留，边缘越来越稀疏
        const edge = r / range;
        if (Math.random() > 1 - edge * edge) continue;

        // 写入坐标
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        // 点的大小随距中心距离衰减：中心 ~0.016，边缘 ~0.010（含基础 0.004）
        sizes[i] = 0.012 * (1 - 0.5 * edge) + 0.004;
        i++;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    return geometry;
}

// ------------------------------------------------------------
// createAccentDotGeometry(count = 1)
// 生成"强调点缀"粒子：围绕莫比乌斯带中心线的法向平面，
// 以随机半径与角度偏移散落一圈稍大的点，比背景星点更醒目。
// 位置 = 中心线上点 + 径向向量/法向量的随机线性组合。
// ------------------------------------------------------------
function createAccentDotGeometry(count = 1) {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const center = new THREE.Vector3();
    const radial = new THREE.Vector3();
    const normal = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
        const u = i / count;
        const t = u * Math.PI * 2; // 绕圈角度
        const halfT = t / 2; // 半角（莫比乌斯扭转）
        const cosT = Math.cos(t);
        const sinT = Math.sin(t);
        const cosHT = Math.cos(halfT);
        const sinHT = Math.sin(halfT);

        // 中心线上的点（s = 0 时，z = 0，落在 XY 平面上的圆）
        center.set(R * cosT, R * sinT, 0);

        // 中心线处的径向方向与表面法向（法向包含了半扭转的 Z 分量）
        radial.set(cosT, sinT, 0);
        normal.set(cosHT * cosT, cosHT * sinT, sinHT);

        // 从圆环向外偏移：偏移半径在 [w+0.4, w+0.8] 随机，角度 0~2π 随机，
        // 使点缀点散落在带子周围一圈
        const r = w + 0.4 + Math.random() * 0.4;
        const angle = Math.random() * Math.PI * 2;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        // 位置 = 中心点 + r * (radial * cosA + normal * sinA)
        // 即在由径向向量和法向向量张成的平面内随机偏移
        positions[i * 3] =
            center.x + r * (radial.x * cosA + normal.x * sinA);
        positions[i * 3 + 1] =
            center.y + r * (radial.y * cosA + normal.y * sinA);
        positions[i * 3 + 2] =
            center.z + r * (radial.z * cosA + normal.z * sinA);

        // 点缀点尺寸在 [0.01, 0.03] 之间随机
        sizes[i] = 0.01 + Math.random() * 0.02;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    return geometry;
}

// ------------------------------------------------------------
// 顶点着色器：负责把每个粒子渲染为带透明度的"圆点"。
//  - size 是逐点传入的 attribute，控制每点的基础大小
//  - 根据到相机的深度（-mvPosition.z）做透视缩放，实现近大远小
//  - 屏幕尺寸过大时（离相机太近）用 smoothstep 渐隐，避免突兀的大点
// ------------------------------------------------------------
const DOT_VERTEX_SHADER = `
    attribute float size;
    varying float vAlpha;
    uniform float uScale;
    uniform float uPixelRatio;
    uniform float uFadeStart;
    uniform float uFadeEnd;

    void main() {
        // 将顶点变换到视图空间（相机空间）
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        // 按到相机的距离进行透视缩放：越远越小
        float screenSize = size * (uScale / -mvPosition.z) * uPixelRatio;
        gl_PointSize = screenSize;

        // 近处大点做渐隐：screenSize 超过 uFadeStart 后透明度递减
        vAlpha = 1.0 - smoothstep(uFadeStart, uFadeEnd, screenSize);
    }
`;

// ------------------------------------------------------------
// 片元（像素）着色器：把每个点画成实心圆。
//  - gl_PointCoord 是点在屏幕上的局部坐标（0~1）
//  - 丢弃圆形外的像素，只保留圆内部分
//  - 输出深灰色（近黑）带透明度的颜色，乘以上一阶段算出的 vAlpha
// ------------------------------------------------------------
const DOT_FRAGMENT_SHADER = `
    varying float vAlpha;
    uniform vec3 uColor;

    void main() {
        // 将局部坐标平移到圆心在 (0,0)，方便判断半径
        vec2 coord = gl_PointCoord - vec2(0.5);
        // 超出半径 0.5（即圆形之外）的像素直接丢弃，形成圆点而不是方块
        if (length(coord) > 0.5) discard;

        // 颜色来自主题 uniform（浅色近黑 / 深色近白），alpha 为 0.85 * vAlpha（带距离渐隐）
        gl_FragColor = vec4(uColor, 0.85 * vAlpha);
    }
`;

// ------------------------------------------------------------
// DotField 组件
// 负责渲染全部粒子（背景星点 + 强调点缀），并驱动它们的动画：
//   1. 入场时从极小缩放到正常大小（GSAP 补间）
//   2. 每帧绕 Z 轴缓慢自转（与相机方向无关）
// 粒子使用共享的 ShaderMaterial，统一控制大小、像素比与渐隐范围。
// ------------------------------------------------------------
function DotField({
    backgroundGeometry,
    accentGeometry,
}: {
    backgroundGeometry: THREE.BufferGeometry;
    accentGeometry: THREE.BufferGeometry;
}) {
    // gl：Three.js 渲染器实例，用于获取像素比（适配高 DPI 屏）
    const {gl} = useThree();
    // 星点颜色（只随主题变化，与当前页面无关）
    const dotColor = useDotColor();
    // groupRef：包裹所有粒子的容器组，便于整体缩放 / 旋转
    const groupRef = useRef<THREE.Group>(null);
    // ownAngle：记录粒子组自身的累计旋转角（绕 Z 轴）
    const ownAngle = useRef(0);

    // 复用材质；主题变化只更新 uniform，不重建 GPU 资源。
    const material = useMemo(
        () =>
            new THREE.ShaderMaterial({
                transparent: true, // 开启透明，支持叠加显示
                depthWrite: false, // 不写入深度缓冲，避免粒子互相遮挡出现黑块
                uniforms: {
                    uScale: {value: 600.0}, // 整体尺寸缩放系数
                    uPixelRatio: {value: gl.getPixelRatio()}, // 设备像素比
                    uFadeStart: {value: 18.0}, // 近处渐隐起始阈值
                    uFadeEnd: {value: 32.0}, // 近处渐隐结束阈值
                    uColor: {value: new THREE.Vector3()}, // 点颜色（随主题）
                },
                vertexShader: DOT_VERTEX_SHADER,
                fragmentShader: DOT_FRAGMENT_SHADER,
            }),
        [gl]
    );

    useEffect(() => {
        material.uniforms.uColor.value.set(...dotColor);
    }, [material, dotColor]);

    useEffect(() => () => material.dispose(), [material]);

    // 监听像素比变化（如跨屏拖动窗口 / 缩放），实时更新 uniform
    useEffect(() => {
        material.uniforms.uPixelRatio.value = gl.getPixelRatio();
    }, [gl, material]);

    // 入场动画：粒子组从 0.01 倍缩放补间到 1 倍，营造"浮现"效果
    useEffect(() => {
        if (!groupRef.current) return;

        groupRef.current.scale.set(0.01, 0.01, 0.01);

        const tween = gsap.to(groupRef.current.scale, {
            x: 1,
            y: 1,
            z: 1,
            duration: 2.2,
            ease: "power2.out",
            delay: 0.1,
        });

        // 组件卸载时销毁补间，避免内存泄漏
        return () => {
            tween.kill();
        };
    }, []);

    // 每帧动画：绕 Z 轴缓慢顺时针自转，速度与帧间隔 delta 成正比
    useFrame((_, delta) => {
        if (!groupRef.current) return;
        // Clockwise rotation in the XY plane, independent of the camera.
        // 在 XY 平面内顺时针旋转，独立于相机视角
        ownAngle.current -= 0.03 * delta;
        groupRef.current.rotation.z = ownAngle.current;
    });

    // 渲染：两批粒子共用同一个材质，挂在同一个 group 下
    return (
        <group ref={groupRef}>
            <points geometry={backgroundGeometry} material={material}/>
            <points geometry={accentGeometry} material={material}/>
        </group>
    );
}

// ------------------------------------------------------------
// MobiusScene 组件
// 场景核心：组合莫比乌斯带（线框 + 表面）、粒子点阵与轨道控制器。
//   1. 生成几何体（均只计算一次）
//   2. 设置画布清屏色
//   3. 入场缩放动画
//   4. 每帧绕 Y 轴自转（莫比乌斯带自身的转动）
// 表面的填充色接近背景色，配合深色线框呈现"纸雕"般的轮廓感。
// ------------------------------------------------------------
function MobiusScene() {
    // gl：渲染器实例，用于设置清屏色
    const {gl} = useThree();
    // 当前主题（用于取画布清屏色）
    const theme = useThemeKey();
    // 莫比乌斯环配色：首页保持原样，其他页面自动"变淡"
    const palette = useRingPalette();
    // groupRef：莫比乌斯带所在的分组，用于缩放与旋转
    const groupRef = useRef<THREE.Group>(null);

    // 用 useMemo 缓存几何体，避免每次渲染都重新生成（性能优化）
    const lineGeometry = useMemo(() => createMobiusLineGeometry(), []);
    const surfaceGeometry = useMemo(() => createMobiusSurfaceGeometry(), []);
    const backgroundDotGeometry = useMemo(() => createBackgroundDotGeometry(), []);
    const accentDotGeometry = useMemo(() => createAccentDotGeometry(), []);

    // 把画布清屏色设为当前主题的背景色（首页/内容页一致）
    useEffect(() => {
        gl.setClearColor(THEME_COLORS[theme].background);
    }, [gl, theme]);

    // 入场动画：整组从极小缩放到正常大小
    useEffect(() => {
        if (!groupRef.current) return;

        groupRef.current.scale.set(0.01, 0.01, 0.01);

        const tween = gsap.to(groupRef.current.scale, {
            x: 1,
            y: 1,
            z: 1,
            duration: 2.2,
            ease: "power2.out",
        });
        return () => { tween.kill(); };
    }, []);

    // 每帧动画：莫比乌斯带绕 Y 轴缓慢自转
    useFrame((_, delta) => {
        if (!groupRef.current) return;
        // The Möbius strip rotates on its own, independent of the camera.
        // 莫比乌斯带自身绕 Y 轴旋转，与相机视角无关
        groupRef.current.rotation.y += 0.1 * delta;
    });

    return (
        <>
            <group ref={groupRef}>
                {/* 表面：meshBasicMaterial 自发光（不受光照影响），
                    开启 DoubleSide 双面渲染 + polygonOffset 使表面优先于线框绘制 */}
                <mesh geometry={surfaceGeometry}>
                    <meshBasicMaterial
                        color={palette.surface}
                        side={THREE.DoubleSide}
                        polygonOffset
                        polygonOffsetFactor={1}
                        polygonOffsetUnits={1}
                    />
                </mesh>
                {/* 线框：灰色线段，polygonOffset 取负值使线框绘制在表面之上 */}
                <lineSegments geometry={lineGeometry}>
                    <lineBasicMaterial
                        color={palette.wireframe}
                        polygonOffset
                        polygonOffsetFactor={-1}
                        polygonOffsetUnits={-1}
                    />
                </lineSegments>
            </group>
            {/* 粒子点阵（背景星点 + 强调点缀） */}
            <DotField
                backgroundGeometry={backgroundDotGeometry}
                accentGeometry={accentDotGeometry}
            />
            {/* 轨道控制器：允许用户缩放 / 旋转视角，限制最近 1、最远 6，禁用平移 */}
            <OrbitControls
                enableZoom
                enablePan={false}
                enableRotate
                minDistance={1}
                maxDistance={6}
            />
        </>
    );
}

// ------------------------------------------------------------
// NoiseOverlay 组件
// 用 Canvas 2D 在页面上绘制一层静态"噪点"（随机散布的半透明黑点），
// 通过 multiply 混合模式叠加，模拟纸张颗粒 / 噪点质感，增强设计氛围。
// 窗口尺寸变化时重新绘制，并按设备像素比适配清晰度。
// ------------------------------------------------------------
function NoiseOverlay() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let frame = 0;
        let previousSize = "";

        // 绘制函数：每次调用都按当前窗口大小重画
        const draw = () => {
            // 设备像素比上限取 2，兼顾清晰度与性能
            const dpr = Math.min(window.devicePixelRatio, 2);
            const width = window.innerWidth;
            const height = window.innerHeight;
            const size = `${width}:${height}:${dpr}`;
            if (previousSize === size) return;
            previousSize = size;

            // 画布物理像素 = 逻辑像素 × dpr
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            // CSS 尺寸保持逻辑像素，铺满整个视口
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            // 让后续绘制按 dpr 缩放坐标系
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            ctx.clearRect(0, 0, width, height);
            // 噪点数量与面积成正比（每 25 平方像素约 1 个点）
            const count = Math.floor(width * height * 0.04);
            for (let i = 0; i < count; i++) {
                // 每个点：随机位置、随机透明度（0 ~ 0.07）的 1×1 黑色像素
                ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.07})`;
                ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
            }
        };

        draw();
        // 窗口尺寸变化时重绘
        const scheduleDraw = () => {
            if (!frame) frame = requestAnimationFrame(() => { frame = 0; draw(); });
        };
        window.addEventListener("resize", scheduleDraw);
        return () => {
            window.removeEventListener("resize", scheduleDraw);
            cancelAnimationFrame(frame);
        };
    }, []);

    return (
        // pointer-events-none：不拦截页面鼠标事件，纯装饰层
        <canvas
            ref={canvasRef}
            className="pointer-events-none fixed inset-0 z-[1]"
            style={{mixBlendMode: "multiply", opacity: 0.55}}
        />
    );
}

// ------------------------------------------------------------
// MobiusBackground —— 组件总出口
// 组合两个图层：
//   1. 底层（z-0）：R3F Canvas，渲染莫比乌斯带 + 粒子（flat 关掉色调映射；
//      camera 置于 (0,0,4.5) 正前方；dpr 按设备像素比限制到 2）
//   2. 顶层（z-[1]）：噪点遮罩层
// 该组件作为网页背景使用，固定覆盖整个视口。
// ------------------------------------------------------------
function MobiusBackgroundContent() {
    return (
        <>
            <div className="fixed inset-0 z-0">
                <Canvas flat
                    camera={{position: [0, 0, 4.5], fov: 65}}
                    gl={{antialias: true, alpha: true}}
                    dpr={typeof window !== "undefined" ? Math.min(window.devicePixelRatio, 2) : 1}
                >
                    <MobiusScene/>
                </Canvas>
            </div>
            <NoiseOverlay/>
        </>
    );
}

export const MobiusBackground = memo(MobiusBackgroundContent);
