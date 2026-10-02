import { noiseChunk } from "./common";

/**
 * The world: domain-warped smoke, a light shaft falling from above, and the halo ring
 * that sits behind every throne on the covers. Graded by the current chapter.
 */
export const smokeFragment = (octaves: number) => /* glsl */ `
precision highp float;
#define OCTAVES ${octaves}
uniform float uTime;
uniform vec2 uRes;
uniform vec2 uPointer;
uniform float uPointerActive;
uniform vec3 uVoid;
uniform vec3 uFog;
uniform vec3 uGlow;
uniform vec3 uAccent;
uniform float uSmoke;
uniform float uShaft;
uniform float uIntro;
uniform float uLow;
uniform float uMid;
uniform float uHigh;
uniform float uKick;
uniform float uBreath;
uniform float uScroll;
varying vec2 vUv;
${noiseChunk}
void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, uv.y);
  float t = uTime * 0.03 * (1.0 + uLow * 1.2) + uScroll * 0.6;

  // pointer pushes the smoke aside
  vec2 pp = vec2((uPointer.x - 0.5) * aspect, 1.0 - uPointer.y);
  float pd = length(p - pp);
  vec2 push = (p - pp) / (pd + 0.001) * exp(-pd * 5.0) * 0.12 * uPointerActive;

  // One level of domain warping (3 fbm calls): most of the look at a fraction of the
  // compile and fill cost of the classic two-level warp.
  vec2 q = p * 1.5 + push * 3.0;
  vec2 w = vec2(fbm(q + vec2(0.0, -t * 2.0)), fbm(q + vec2(5.2, 1.3) - vec2(0.0, t * 1.6)));
  float n = fbm(q + 3.2 * w + vec2(1.7, -t * 3.0));

  float bottom = smoothstep(1.05, -0.1, uv.y);
  float density = smoothstep(0.32, 0.95, n) * (0.3 + 0.95 * bottom) * uSmoke;
  density *= mix(0.25, 1.0, uIntro) * (1.0 + uKick * 0.35);

  // light shaft from top-centre
  float sx = abs(uv.x - 0.5) * aspect;
  float core = exp(-sx * sx * 42.0);
  float wide = exp(-sx * sx * 3.5);
  float fall = smoothstep(-0.25, 1.0, uv.y);
  float rays = 0.55 + 0.45 * fbm(vec2(sx * 7.0, uv.y * 1.2 - t * 2.0));
  float shaft = (core * 0.5 + wide * 0.16) * fall * rays * uShaft * (0.75 + uMid * 1.8 + uBreath * 0.3);

  // halo ring (crown/throne motif — kept faint)
  vec2 hp = vec2(p.x, uv.y - 0.8);
  float r = length(hp);
  float ang = atan(hp.x, hp.y);
  float ring = exp(-pow((r - 0.2) * 60.0, 2.0)) * (0.25 + 0.75 * noise(vec2(ang * 5.0, t * 3.0)));
  ring *= uShaft * 0.4 * (1.0 + uKick * 2.5);

  vec3 col = uVoid;
  col = mix(col, uFog, density * 0.9);
  col += uGlow * shaft * (0.3 + density * 0.6);
  col += uGlow * ring * 0.45;
  col += uFog * density * wide * 0.4 * uShaft;
  col += uAccent * bottom * bottom * 0.035 * (1.0 + uHigh * 4.0);
  col += uGlow * exp(-pd * 6.0) * 0.045 * uPointerActive;
  col += uGlow * uKick * 0.025;

  vec2 vc = uv - 0.5;
  col *= 1.0 - dot(vc, vc) * 0.85;
  col = mix(uVoid, col, uIntro);
  gl_FragColor = vec4(col, 1.0);
}
`;

/** Ash falls, embers rise. All motion is computed on the GPU from per-particle seeds. */
export const particleVertex = /* glsl */ `
attribute vec3 position;
attribute vec4 aRand;
uniform float uTime;
uniform vec2 uRes;
uniform float uDpr;
uniform float uEmbers;
uniform float uLow;
uniform float uHigh;
uniform float uBurst;
uniform float uIntro;
varying float vAlpha;
varying float vEmber;
void main() {
  float emberShare = 0.12 + 0.3 * uEmbers;
  float isEmber = step(1.0 - emberShare, aRand.w);
  float speed = mix(0.008, 0.03, aRand.x) * mix(1.0, 2.0, isEmber);
  float dir = mix(-1.0, 1.0, isEmber);
  float y = fract(position.y + dir * uTime * speed);
  float sway = sin(uTime * (0.25 + aRand.y * 0.5) + aRand.z * 6.2831) * (0.015 + 0.03 * aRand.x) * (1.0 + uLow * 2.5);
  vec2 pos = vec2(position.x + sway, y);

  // burst: everything is thrown outward from the centre, then settles
  vec2 dirC = normalize(pos - vec2(0.5, 0.5) + 0.0001);
  pos += dirC * uBurst * (0.15 + 0.35 * aRand.x);

  gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
  float size = mix(1.0, 3.0, aRand.y) * mix(1.0, 1.5, isEmber) * (1.0 + uHigh * isEmber * 2.0);
  gl_PointSize = size * uDpr * (0.6 + uRes.y / 1100.0);

  float edge = smoothstep(0.0, 0.08, y) * smoothstep(1.0, 0.86, y);
  float flicker = mix(1.0, 0.55 + 0.45 * sin(uTime * (2.5 + aRand.z * 6.0) + aRand.x * 30.0), isEmber);
  vAlpha = edge * flicker * mix(0.25, 0.75, aRand.z) * uIntro * (1.0 + uBurst * 2.0);
  vEmber = isEmber;
}
`;

export const particleFragment = /* glsl */ `
precision mediump float;
uniform vec3 uAshColor;
uniform vec3 uGlow;
varying float vAlpha;
varying float vEmber;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float soft = smoothstep(0.5, 0.0, d);
  vec3 col = mix(uAshColor, uGlow, vEmber);
  float a = soft * vAlpha;
  gl_FragColor = vec4(col * a, a);
}
`;
