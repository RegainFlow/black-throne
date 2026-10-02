"use client";

import { grades } from "@black-throne/content/grades";
import { Geometry, Mesh, Program, Renderer, Triangle } from "ogl";
import { useEffect, useRef } from "react";
import { QUALITY } from "@/lib/quality";
import { world } from "@/lib/world-store";
import { fullscreenVertex } from "@/shaders/common";
import { precompile } from "@/shaders/precompile";
import { particleFragment, particleVertex, smokeFragment } from "@/shaders/world";

type Vec3 = [number, number, number];

const hexToVec3 = (hex: string): Vec3 => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (out: Vec3, to: Vec3, t: number) => {
  out[0] = lerp(out[0], to[0], t);
  out[1] = lerp(out[1], to[1], t);
  out[2] = lerp(out[2], to[2], t);
};

function gradeUniforms(id: keyof typeof grades) {
  const g = grades[id];
  return {
    void: hexToVec3(g.void),
    fog: hexToVec3(g.fog),
    glow: hexToVec3(g.glow),
    accent: hexToVec3(g.accent),
    ash: hexToVec3(g.smoke),
    smoke: g.world.smoke,
    shaft: g.world.shaft,
    embers: g.world.embers,
  };
}

/** The persistent world behind every page. Mounted once in the root layout, survives navigation. */
export default function WorldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const state = world.getState();
    const tier = QUALITY[state.quality];

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        canvas,
        dpr: Math.min(window.devicePixelRatio, 1.5) * tier.dpr,
        alpha: false,
        antialias: false,
        depth: false,
        powerPreference: "high-performance",
      });
    } catch {
      return; // no WebGL → the CSS fallback stays
    }
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 1);
    let disposed = false;
    let teardown = () => {};
    const smokeSource = { vertex: fullscreenVertex, fragment: smokeFragment(tier.octaves) };
    const particleSource = { vertex: particleVertex, fragment: particleFragment };

    // Shader compile is the single most expensive thing on this site — do it off the main thread.
    void precompile(gl, [smokeSource, particleSource], () => disposed).then(() => {
      if (!disposed) teardown = start();
    });

    return () => {
      disposed = true;
      teardown();
    };

    function start(): () => void {
      const current = gradeUniforms(state.grade);
      const uniforms = {
        uTime: { value: 0 },
        uRes: { value: [1, 1] },
        uPointer: { value: [0.5, 0.5] },
        uPointerActive: { value: 0 },
        uVoid: { value: current.void },
        uFog: { value: current.fog },
        uGlow: { value: current.glow },
        uAccent: { value: current.accent },
        uSmoke: { value: current.smoke },
        uShaft: { value: current.shaft },
        uIntro: { value: state.intro === "world" ? 1 : 0 },
        uLow: { value: 0 },
        uMid: { value: 0 },
        uHigh: { value: 0 },
        uKick: { value: 0 },
        uBreath: { value: 0 },
        uScroll: { value: 0 },
      };

      const smoke = new Mesh(gl, {
        geometry: new Triangle(gl),
        program: new Program(gl, {
          ...smokeSource,
          uniforms,
          depthTest: false,
          depthWrite: false,
        }),
      });

      const count = tier.particles;
      const seeds = new Float32Array(count * 3);
      const rand = new Float32Array(count * 4);
      for (let i = 0; i < count; i++) {
        seeds.set([Math.random(), Math.random(), 0], i * 3);
        rand.set([Math.random(), Math.random(), Math.random(), Math.random()], i * 4);
      }
      const particleUniforms = {
        uTime: uniforms.uTime,
        uRes: uniforms.uRes,
        uDpr: { value: renderer.dpr },
        uEmbers: { value: current.embers },
        uLow: uniforms.uLow,
        uHigh: uniforms.uHigh,
        uBurst: { value: 0 },
        uIntro: uniforms.uIntro,
        uAshColor: { value: current.ash },
        uGlow: uniforms.uGlow,
      };
      const particleProgram = new Program(gl, {
        ...particleSource,
        uniforms: particleUniforms,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      // Premultiplied "over" blending: ash drifts as soft motes instead of additive glitter.
      particleProgram.setBlendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      const particles = new Mesh(gl, {
        mode: gl.POINTS,
        geometry: new Geometry(gl, {
          position: { size: 3, data: seeds },
          aRand: { size: 4, data: rand },
        }),
        program: particleProgram,
      });

      const resize = () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        uniforms.uRes.value = [gl.canvas.width, gl.canvas.height];
      };
      resize();
      window.addEventListener("resize", resize);

      let raf = 0;
      let last = performance.now();
      let lastDraw = 0;
      let time = Math.random() * 100;
      let shown = false;
      const frameInterval = 1000 / tier.fps;

      const draw = () => {
        renderer.render({ scene: smoke });
        renderer.render({ scene: particles, clear: false });
        if (!shown) {
          shown = true;
          (gl.canvas as HTMLCanvasElement).style.opacity = "1";
        }
      };

      const step = (now: number) => {
        raf = requestAnimationFrame(step);
        if (now - lastDraw < frameInterval - 1) return;
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        lastDraw = now;

        const s = world.getState();
        const target = gradeUniforms(s.grade);
        const k = 1 - Math.exp(-dt * 1.4);
        lerp3(current.void, target.void, k);
        lerp3(current.fog, target.fog, k);
        lerp3(current.glow, target.glow, k);
        lerp3(current.accent, target.accent, k);
        lerp3(current.ash, target.ash, k);
        uniforms.uSmoke.value = lerp(uniforms.uSmoke.value, target.smoke, k);
        uniforms.uShaft.value = lerp(uniforms.uShaft.value, target.shaft, k);
        particleUniforms.uEmbers.value = lerp(particleUniforms.uEmbers.value, target.embers, k);

        const introTarget = s.intro === "threshold" ? 0 : 1;
        uniforms.uIntro.value = lerp(
          uniforms.uIntro.value,
          introTarget,
          1 - Math.exp(-dt * (s.intro === "entering" ? 0.9 : 3)),
        );

        const b = s.bands;
        uniforms.uLow.value = b.low;
        uniforms.uMid.value = b.mid;
        uniforms.uHigh.value = b.high;
        uniforms.uKick.value = b.kick;
        const breathTarget = s.spotifyPlaying ? 0.5 + 0.5 * Math.sin(now / 900) : 0;
        uniforms.uBreath.value = lerp(uniforms.uBreath.value, breathTarget, k);
        uniforms.uScroll.value = lerp(uniforms.uScroll.value, s.scroll, k);

        uniforms.uPointer.value = [s.pointer.x, s.pointer.y];
        uniforms.uPointerActive.value = lerp(
          uniforms.uPointerActive.value,
          s.pointer.active ? 1 : 0,
          k * 2,
        );
        const since = now - s.burstAt;
        particleUniforms.uBurst.value = since < 4000 ? Math.exp(-since / 700) : 0;

        time += dt * (1 + b.low * 0.8);
        uniforms.uTime.value = time;
        draw();
      };

      const reduced = world.getState().reducedMotion;
      if (reduced) {
        // One still frame, redrawn only when the grade changes.
        uniforms.uIntro.value = 1;
        draw();
        const unsub = world.subscribe((s, prev) => {
          if (s.grade === prev.grade) return;
          const t = gradeUniforms(s.grade);
          Object.assign(current, t);
          uniforms.uVoid.value = t.void;
          uniforms.uFog.value = t.fog;
          uniforms.uGlow.value = t.glow;
          uniforms.uAccent.value = t.accent;
          uniforms.uSmoke.value = t.smoke;
          uniforms.uShaft.value = t.shaft;
          particleUniforms.uAshColor.value = t.ash;
          draw();
        });
        return () => {
          unsub();
          window.removeEventListener("resize", resize);
        };
      }

      const onVisibility = () => {
        cancelAnimationFrame(raf);
        if (!document.hidden) {
          last = performance.now();
          raf = requestAnimationFrame(step);
        }
      };
      document.addEventListener("visibilitychange", onVisibility);
      raf = requestAnimationFrame(step);

      return () => {
        cancelAnimationFrame(raf);
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("resize", resize);
      };
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-0 transition-opacity duration-[2400ms]"
    />
  );
}
