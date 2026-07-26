/*
 * Contained network graph. Zone: src/graph/**.
 *
 * The signature visual is the full-bleed <GraphStage>: two fixed canvases the
 * whole page lives inside. This is the same engine boxed into an element, for the
 * places that genuinely need a framed instance rather than the stage: a terminal
 * panel, a card in a deck, a screenshot.
 *
 * It runs the same physics, the same event handling and the same renderers. Only
 * the viewport differs, and the camera zoom is scaled so a narrow box still
 * frames the scene it was pointed at instead of showing a fifth of it.
 *
 * It does not open a second animation loop. Every instance subscribes to the one
 * frame MotionProvider owns.
 */

import { useRef } from "react";

import { DEBUG } from "../lib/env";
import type { SceneId } from "../lib/stage";
import type { EventStream } from "../lib/types";
import type { GraphMode } from "./mode";
import { useGraphEngine } from "./useGraphEngine";
import "./graph.css";

export interface NetworkGraphProps {
  /** hero is interactive and loud, ambient sits behind copy, compact is dense. */
  mode?: GraphMode;
  /** Pin the camera. Omitted, it follows the page's scroll camera. */
  scene?: SceneId;
  /** Override the app stream. Omitted, it uses the one from EventStreamProvider. */
  stream?: EventStream;
  className?: string;
  /** CSS height for the box. The width always fills the parent. */
  height?: number | string;
}

export function NetworkGraph({
  mode = "compact",
  scene,
  stream,
  className,
  height = 260,
}: NetworkGraphProps) {
  const host = useRef<HTMLDivElement | null>(null);
  const back = useRef<HTMLCanvasElement | null>(null);
  const front = useRef<HTMLCanvasElement | null>(null);
  const debug = useRef<HTMLDivElement | null>(null);

  useGraphEngine({ back, front, host, mode, scene, stream, debug });

  return (
    <div
      ref={host}
      className={className ? `graph-box ${className}` : "graph-box"}
      style={{ height: typeof height === "number" ? `${height}px` : height }}
      data-graph-mode={mode}
    >
      <canvas ref={back} className="graph-box-layer graph-box-back" aria-hidden="true" />
      <canvas ref={front} className="graph-box-layer graph-box-front" aria-hidden="true" />
      {DEBUG ? <div ref={debug} className="graph-debug graph-debug-inline spec" aria-hidden="true" /> : null}
    </div>
  );
}

export default NetworkGraph;
