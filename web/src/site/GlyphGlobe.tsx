import { useEffect, useRef } from "react";

/**
 * The hero object: a slowly turning globe built out of small marks. Points sit
 * on a sphere, project with perspective, and are drawn as glyphs whose weight
 * falls away with depth, so the silhouette reads as a sphere without any of it
 * being drawn as an outline.
 *
 * It runs its own frame loop, pauses when scrolled out of view or when the tab
 * is hidden, and holds still under reduced motion.
 */

const GLYPHS = ["|", "T", "L", "┐", "└", "─", "¬", "•", "+", "▫"];
const POINT_COUNT = 1400;

interface Point {
  x: number;
  y: number;
  z: number;
  glyph: string;
  weight: number;
}

function buildSphere(count: number): Point[] {
  const points: Point[] = [];
  // Fibonacci sphere: even coverage without clustering at the poles.
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    points.push({
      x: Math.cos(theta) * radius,
      y,
      z: Math.sin(theta) * radius,
      glyph: GLYPHS[i % GLYPHS.length],
      weight: 0.35 + ((i * 37) % 100) / 100 * 0.65,
    });
  }
  return points;
}

export function GlyphGlobe({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const points = buildSphere(POINT_COUNT);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let angle = 0;
    let visible = true;
    let last = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.42;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      // A slight tilt keeps it from reading as a flat ring.
      const tilt = 0.42;
      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);

      for (const point of points) {
        // Rotate around the vertical axis, then tilt towards the viewer.
        const rx = point.x * cos - point.z * sin;
        const rz = point.x * sin + point.z * cos;
        const ry = point.y * cosT - rz * sinT;
        const rz2 = point.y * sinT + rz * cosT;

        // Perspective: nearer points sit further out and read heavier.
        const depth = 1 / (2.4 - rz2);
        const px = cx + rx * radius * depth * 2.4;
        const py = cy + ry * radius * depth * 2.4;

        const near = (rz2 + 1) / 2;
        const alpha = 0.06 + near * near * 0.5 * point.weight;
        const size = 6 + near * 7;

        ctx.font = `${size.toFixed(1)}px "Geist Mono Variable", ui-monospace, monospace`;
        ctx.fillStyle = `rgba(0,0,0,${alpha.toFixed(3)})`;
        ctx.fillText(point.glyph, px, py);
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (visible && !reduced) {
        angle += dt * 0.00013;
        draw();
      }
      frame = window.requestAnimationFrame(tick);
    };

    resize();
    draw();
    frame = window.requestAnimationFrame(tick);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible = entry.isIntersecting;
      },
      { threshold: 0 },
    );
    observer.observe(canvas);

    const onResize = () => {
      resize();
      draw();
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} style={{ display: "block", width: "100%", height: "100%" }} />;
}
