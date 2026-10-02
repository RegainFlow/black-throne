import { noiseChunk } from "./common";

/**
 * Ash-burn reveal: the artwork burns into existence from the bottom up, with a glowing
 * ember rim and charred edges. `uProgress` 0 → nothing, 1 → fully revealed.
 */
export const burnFragment = /* glsl */ `
precision highp float;
#define OCTAVES 4
uniform sampler2D tMap;
uniform float uProgress;
uniform float uTime;
uniform vec3 uGlow;
uniform vec3 uVoid;
varying vec2 vUv;
${noiseChunk}
void main() {
  vec2 uv = vUv;
  vec4 tex = texture2D(tMap, uv);
  float n = fbm(uv * vec2(3.0, 5.5) + vec2(0.0, uTime * 0.02));
  float v = n * 0.65 + (1.0 - uv.y) * 0.35;
  float threshold = uProgress * 1.3 - 0.15;
  float d = threshold - v;
  float visible = smoothstep(0.0, 0.015, d);
  float rim = visible * (1.0 - smoothstep(0.0, 0.05, d));
  float char = 1.0 - smoothstep(0.0, 0.16, d);
  float sparks = smoothstep(-0.025, 0.0, d) * (1.0 - visible) * step(0.86, noise(uv * 90.0 + uTime));
  float flicker = 0.75 + 0.25 * noise(vec2(uTime * 6.0, uv.y * 20.0));
  vec3 col = mix(tex.rgb, uVoid, char * 0.75);
  col += uGlow * rim * 2.2 * flicker;
  col += uGlow * sparks * 1.5;
  float a = clamp(visible + sparks, 0.0, 1.0);
  gl_FragColor = vec4(col * a, a);
}
`;
