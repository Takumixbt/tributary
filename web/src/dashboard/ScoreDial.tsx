/*
 * Score dial. Zone: src/dashboard/**.
 *
 * A dithered arc, not a gauge. The sweep is stippled with the same density trick
 * the graph uses for score auras, so the dial and the node read as one fact drawn
 * twice: the arc reaches the score, and the stipple thickens toward the head. The
 * number at the center gets the glyph-settle treatment, which stays editorial
 * because a score only moves a few times a minute.
 *
 * The stipple set is precomputed per size and the whole field is one fill call,
 * so a shimmering dial costs one path per frame. It is cleared with clearRect
 * rather than a phosphor wash: this canvas sits on a translucent panel, and
 * painting black every frame would fill the panel in.
 */

import { useEffect, useMemo, useRef } from "react";
import { GlyphSettle, useMotion, useTick } from "../kinetic";
import { formatScore } from "../lib/format";
import { clamp, damp, noise2 } from "../lib/motion";
import { fitCanvas, ink } from "../lib/paint";
import "./dashboard.css";

export interface ScoreDialProps {
  score: number;
  /** Diameter in px. Default 180. */
  size?: number;
  /** The underwriter's reason for this score. */
  reason?: string;
}

const START = Math.PI * 0.75;
const SWEEP = Math.PI * 1.5;
const STIPPLE = 460;

interface Stipple {
  angleT: number;
  x: number;
  y: number;
  threshold: number;
  seed: number;
}

function buildStipple(size: number): Stipple[] {
  const cx = size / 2;
  const cy = size / 2;
  const outer = size / 2 - 10;
  const inner = size / 2 - 24;
  const points: Stipple[] = [];

  for (let i = 0; i < STIPPLE; i++) {
    const angleT = (i + 0.5) / STIPPLE;
    const radiusT = noise2(i * 0.137, i * 0.911);
    const threshold = noise2(i * 0.577, i * 0.311);
    const angle = START + SWEEP * angleT;
    const radius = inner + (outer - inner) * radiusT;
    points.push({
      angleT,
      x: Math.round(cx + Math.cos(angle) * radius),
      y: Math.round(cy + Math.sin(angle) * radius),
      threshold,
      seed: noise2(i * 0.733, i * 0.199),
    });
  }
  return points;
}

export function ScoreDial({ score, size = 180, reason }: ScoreDialProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { motionScale } = useMotion();
  const points = useMemo(() => buildStipple(size), [size]);

  const shown = useRef(score);
  const phase = useRef(0);
  const target = useRef(score);
  target.current = score;

  const draw = (progress: number, shimmer: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = size / 2;
    const cy = size / 2;
    const rim = size / 2 - 6;
    const inner = size / 2 - 27;

    ctx.clearRect(0, 0, size, size);

    // Track and inner rule: the dial's structure, visible at any score.
    ctx.lineWidth = 1;
    ctx.strokeStyle = ink(1, 0.12);
    ctx.beginPath();
    ctx.arc(cx, cy, rim, START, START + SWEEP);
    ctx.stroke();
    ctx.strokeStyle = ink(1, 0.06);
    ctx.beginPath();
    ctx.arc(cx, cy, inner, START, START + SWEEP);
    ctx.stroke();

    // Ticks every 100 points, longer at 0, 500 and 1000.
    ctx.strokeStyle = ink(1, 0.16);
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      if (i % 5 === 0) continue;
      const angle = START + (SWEEP * i) / 10;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      ctx.moveTo(cx + cos * (rim + 1), cy + sin * (rim + 1));
      ctx.lineTo(cx + cos * (rim + 4), cy + sin * (rim + 4));
    }
    ctx.stroke();
    ctx.strokeStyle = ink(1, 0.34);
    ctx.beginPath();
    for (let i = 0; i <= 10; i += 5) {
      const angle = START + (SWEEP * i) / 10;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      ctx.moveTo(cx + cos * (rim + 1), cy + sin * (rim + 1));
      ctx.lineTo(cx + cos * (rim + 7), cy + sin * (rim + 7));
    }
    ctx.stroke();

    // The score itself: one path, thresholded per point.
    const reach = clamp(progress / 1000, 0, 1);
    if (reach > 0) {
      ctx.fillStyle = ink(1, 0.86);
      ctx.beginPath();
      for (const point of points) {
        if (point.angleT > reach) continue;
        const local = point.angleT / reach;
        const density = 0.22 + 0.78 * local + shimmer * Math.sin(point.seed * 21 + phase.current * 5.2);
        if (point.threshold < density) ctx.rect(point.x, point.y, 1, 1);
      }
      ctx.fill();

      const head = START + SWEEP * reach;
      const cos = Math.cos(head);
      const sin = Math.sin(head);
      ctx.strokeStyle = ink(1, 0.9);
      ctx.beginPath();
      ctx.moveTo(cx + cos * (inner - 2), cy + sin * (inner - 2));
      ctx.lineTo(cx + cos * (rim + 2), cy + sin * (rim + 2));
      ctx.stroke();
      ctx.fillStyle = ink(1, 1);
      const mid = (inner + rim) / 2;
      ctx.beginPath();
      ctx.arc(cx + cos * mid, cy + sin * mid, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    fitCanvas(canvas, size, size);
    draw(shown.current, 0);
    // draw closes over refs only, so it never needs to be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  useTick((dt) => {
    const next =
      motionScale === 0 ? target.current : damp(shown.current, target.current, 190, dt);
    const moved = Math.abs(next - shown.current) > 0.05;
    shown.current = next;

    if (motionScale === 0) {
      if (moved) draw(next, 0);
      return;
    }
    phase.current += dt * 0.0009;
    draw(next, 0.045);
  });

  const label = `Score ${formatScore(score)} of 1000${reason ? `. ${reason}` : ""}`;

  return (
    <div className="dial" style={{ width: size, height: size }} role="img" aria-label={label}>
      <canvas ref={canvasRef} className="dial-canvas" aria-hidden="true" />
      <div className="dial-center">
        <GlyphSettle className="dial-score" value={formatScore(score)} />
        <span className="dial-caption">Score</span>
      </div>
    </div>
  );
}

export default ScoreDial;
