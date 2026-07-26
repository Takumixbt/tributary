/*
 * The living graph. Zone: src/graph/**.
 *
 * Two fixed full-viewport canvases mounted once for the life of the app:
 *
 *   back   edges, trails, score auras and the unfeatured economy, behind the
 *          content at low alpha
 *   front  pulses, the featured node, the split flash and the anchor connectors,
 *          above the content with pointer-events: none
 *
 * Both are cleared with a translucent black rect instead of clearRect, so
 * everything leaves a decaying phosphor trail and a burst of traffic literally
 * glows brighter.
 *
 * The stage never unmounts. Route changes and scroll move a camera over one
 * continuous simulation, which is the whole reason the graph reads as a place
 * rather than a widget.
 */

import { useEffect, useRef } from "react";
import { useInRouterContext, useLocation } from "react-router-dom";

import { DEBUG } from "../lib/env";
import { useGraphCamera } from "./GraphScene";
import type { GraphMode } from "./mode";
import { useGraphEngine } from "./useGraphEngine";
import "./graph.css";

export interface GraphStageProps {
  /** Force a mode. Omitted, the stage picks one from the route. */
  mode?: GraphMode;
}

/**
 * The terminal is dense and the graph runs behind it, so the stage steps down to
 * compact there. The landing page gets the full-bleed interactive treatment.
 */
function modeForPath(pathname: string): GraphMode {
  return pathname.startsWith("/app") ? "compact" : "hero";
}

export function GraphStage({ mode }: GraphStageProps = {}) {
  // Two components, because useLocation is only legal inside a router and the
  // stage has to keep working in isolation (tests, a storybook, a bare mount).
  return useInRouterContext() ? <RoutedStage mode={mode} /> : <Stage mode={mode ?? "hero"} />;
}

function RoutedStage({ mode }: GraphStageProps) {
  const { pathname } = useLocation();
  const camera = useGraphCamera();
  const focus = useRef(camera.focus);
  focus.current = camera.focus;

  // Opening the terminal reframes the simulation on the vault cluster. Scrolling
  // a page with its own <GraphScene> takes over from there.
  useEffect(() => {
    focus.current(pathname.startsWith("/app") ? "dashboard" : "hero");
  }, [pathname]);

  return <Stage mode={mode ?? modeForPath(pathname)} />;
}

function Stage({ mode }: { mode: GraphMode }) {
  const back = useRef<HTMLCanvasElement | null>(null);
  const front = useRef<HTMLCanvasElement | null>(null);
  const debug = useRef<HTMLDivElement | null>(null);

  useGraphEngine({ back, front, mode, primary: true, debug });

  return (
    <>
      <canvas
        ref={back}
        className="graph-layer graph-layer-back"
        data-graph-mode={mode}
        aria-hidden="true"
      />
      <canvas
        ref={front}
        className="graph-layer graph-layer-front"
        data-graph-mode={mode}
        aria-hidden="true"
      />
      {DEBUG ? <div ref={debug} className="graph-debug spec" aria-hidden="true" /> : null}
    </>
  );
}

export default GraphStage;
