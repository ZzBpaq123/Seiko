export const DOT_VERTEX_SHADER = `
  attribute float size;
  varying float vAlpha;
  uniform float uScale;
  uniform float uPixelRatio;
  uniform float uFadeStart;
  uniform float uFadeEnd;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float screenSize = size * (uScale / -mvPosition.z) * uPixelRatio;
    gl_PointSize = screenSize;

    vAlpha = 1.0 - smoothstep(uFadeStart, uFadeEnd, screenSize);
  }
`;

export const DOT_FRAGMENT_SHADER = `
  varying float vAlpha;
  uniform vec3 uColor;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    if (length(coord) > 0.5) discard;

    gl_FragColor = vec4(uColor, 0.85 * vAlpha);
  }
`;
