"use client";

import { grades } from "@black-throne/content/grades";
import type { GradeId } from "@black-throne/content/types";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Mesh, Program, Renderer, Texture, Triangle } from "ogl";
import { type ReactNode, useEffect, useRef } from "react";
import { world } from "@/lib/world-store";
import { burnFragment } from "@/shaders/burn";
import { fullscreenVertex } from "@/shaders/common";
import { precompile } from "@/shaders/precompile";

gsap.registerPlugin(ScrollTrigger);

const hex = (h: string) => {
  const n = Number.parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/**
 * Wraps a <CoverPicture>. When the artwork scrolls in, it burns into existence (WebGL dissolve
 * with an ember rim); the real <img> takes over once fully revealed. Without WebGL, or with
 * reduced motion, the plain image is simply shown.
 */
export function BurnReveal({
  children,
  grade,
  className,
}: {
  children: ReactNode;
  grade: GradeId;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    const img = el?.querySelector("img");
    if (!el || !img || world.getState().reducedMotion) return;

    let renderer: Renderer | undefined;
    let canvas: HTMLCanvasElement | undefined;
    let raf = 0;
    let disposed = false;
    const progress = { value: 0 };
    const g = grades[grade];

    const setImgVisible = (visible: boolean) => {
      img.style.opacity = visible ? "1" : "0";
    };

    const mount = async () => {
      try {
        if (!img.complete) await img.decode().catch(() => undefined);
        if (disposed) return;
        canvas = document.createElement("canvas");
        canvas.setAttribute("aria-hidden", "true");
        canvas.className = "pointer-events-none absolute inset-0 h-full w-full";
        el.appendChild(canvas);
        renderer = new Renderer({
          canvas,
          dpr: Math.min(window.devicePixelRatio, 1.5),
          alpha: true,
          premultipliedAlpha: true,
        });
        const gl = renderer.gl;
        await precompile(
          gl,
          [{ vertex: fullscreenVertex, fragment: burnFragment }],
          () => disposed,
        );
        if (disposed) return;
        const texture = new Texture(gl, { image: img, generateMipmaps: false });
        const uniforms = {
          tMap: { value: texture },
          uProgress: { value: 0 },
          uTime: { value: 0 },
          uGlow: { value: hex(g.glow) },
          uVoid: { value: hex(g.void) },
        };
        const program = new Program(gl, {
          vertex: fullscreenVertex,
          fragment: burnFragment,
          uniforms,
          transparent: true,
        });
        const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
        const resize = () => {
          const r = el.getBoundingClientRect();
          renderer?.setSize(r.width, r.height);
        };
        resize();
        const ro = new ResizeObserver(resize);
        ro.observe(el);

        const loop = (t: number) => {
          raf = requestAnimationFrame(loop);
          uniforms.uProgress.value = progress.value;
          uniforms.uTime.value = t / 1000;
          const done = progress.value >= 0.999;
          setImgVisible(done);
          if (canvas) canvas.style.opacity = done ? "0" : "1";
          if (!done && progress.value > 0.001) renderer?.render({ scene: mesh });
          else if (progress.value <= 0.001) gl.clear(gl.COLOR_BUFFER_BIT);
        };
        setImgVisible(progress.value >= 0.999);
        raf = requestAnimationFrame(loop);
        cleanupRenderer = () => {
          ro.disconnect();
          cancelAnimationFrame(raf);
          gl.getExtension("WEBGL_lose_context")?.loseContext();
          canvas?.remove();
          setImgVisible(true);
        };
      } catch {
        setImgVisible(true);
      }
    };

    let cleanupRenderer = () => setImgVisible(true);

    // Only keep a WebGL context alive while the artwork is near the viewport.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !renderer) void mount();
        if (!entry?.isIntersecting && renderer) {
          cleanupRenderer();
          renderer = undefined;
        }
      },
      { rootMargin: "40% 0px" },
    );
    io.observe(el);

    setImgVisible(false);
    const tween = gsap.to(progress, {
      value: 1,
      ease: "none",
      scrollTrigger: { trigger: el, start: "top 92%", end: "center 55%", scrub: 0.6 },
    });

    return () => {
      disposed = true;
      io.disconnect();
      tween.scrollTrigger?.kill();
      tween.kill();
      cleanupRenderer();
    };
  }, [grade]);

  return (
    <div ref={root} className={`relative ${className ?? ""}`}>
      {children}
    </div>
  );
}
