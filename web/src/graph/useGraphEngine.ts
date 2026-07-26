/*
 * Engine wiring. Zone: src/graph/**.
 *
 * Owns the world, subscribes to the shared frame from useTick, subscribes to the
 * event stream to spawn pulses, syncs topology from each snapshot, and paints
 * both canvas layers. One hook, one frame, no internal rAF loop.
 *
 * Rules this file exists to keep:
 *   - no requestAnimationFrame here: the frame comes from MotionProvider
 *   - no setState at frame rate: everything per-frame lives in a ref
 *   - canvases are resized in resize handlers, never inside the frame
 *   - under reduced motion the layout is static and the canvas is repainted only
 *     when something actually happened
 */

import { useEffect, useRef, type MutableRefObject } from "react";

import { useEventStream } from "../data";
import { useMotion, useTick } from "../kinetic";
import { DEBUG } from "../lib/env";
import { clamp } from "../lib/motion";
import { fitCanvas, phosphorClear } from "../lib/paint";
import type { SceneId } from "../lib/stage";
import type { EventStream, StreamSnapshot, TributaryEvent } from "../lib/types";

import { useAnchorRects } from "./anchors";
import { createCamera, cutCamera, projection, screenToScene, stepCamera } from "./camera";
import { useGraphCamera } from "./GraphScene";
import { preset, type GraphMode } from "./mode";
import { drawConnectors, drawEdges } from "./render/edges";
import { drawNodes } from "./render/nodes";
import { drawPulses } from "./render/pulses";
import { PHYSICS, PHYSICS_AMBIENT, stepPhysics, warmup } from "./sim/physics";
import { spawnFromEvent, spawnSelfTest, stepPulses } from "./sim/pulses";
import { buildScaffold, createWorld, syncAnchors, syncTopology } from "./sim/topology";
import { publishPulsePoint } from "./useLatestPulsePoint";
import type { GraphWorld } from "./types";

export interface GraphEngineHandles {
  back: MutableRefObject<HTMLCanvasElement | null>;
  front: MutableRefObject<HTMLCanvasElement | null>;
  /** Element the canvases fill. Omit for the fixed full-viewport stage. */
  host?: MutableRefObject<HTMLElement | null>;
  mode?: GraphMode;
  /** Only the primary stage publishes the latest pulse point to other zones. */
  primary?: boolean;
  /** Pin the camera to one scene instead of following the scroll camera. */
  scene?: SceneId;
  /** Optional element the debug readout writes into. */
  debug?: MutableRefObject<HTMLElement | null>;
  /** Override the app's stream. Defaults to the one from EventStreamProvider. */
  stream?: EventStream;
}

/** How long a reduced-motion stage keeps repainting after something happened. */
const WAKE_MS = 620;

export function useGraphEngine(handles: GraphEngineHandles): GraphWorld | null {
  const { back, front, host, mode = "hero", primary = false, scene, debug } = handles;

  const contextStream = useEventStream();
  const stream = handles.stream ?? contextStream;
  const rects = useAnchorRects();
  const camera = useGraphCamera();
  const { motionScale, fpsRef } = useMotion();

  const worldRef = useRef<GraphWorld | null>(null);
  if (!worldRef.current) {
    const world = createWorld();
    buildScaffold(world);
    warmup(world, 3.2);
    worldRef.current = world;
  }

  const cameraRef = useRef(createCamera(scene ?? "hero"));
  const sceneRef = useRef<SceneId>(scene ?? camera.scene);
  sceneRef.current = scene ?? camera.scene;

  const modeRef = useRef(mode);
  modeRef.current = mode;
  const motionRef = useRef(motionScale);
  motionRef.current = motionScale;

  /** The box the composition is framed inside, in canvas pixels. */
  const viewport = useRef({ width: 0, height: 0 });
  /** Box origin plus host origin: screen pixels to box pixels. */
  const offset = useRef({ x: 0, y: 0 });
  /** Full canvas size. Larger than the box: the canvas always bleeds. */
  const canvasSize = useRef({ width: 0, height: 0 });
  const boxOrigin = useRef({ x: 0, y: 0 });
  const ctxBack = useRef<CanvasRenderingContext2D | null>(null);
  const ctxFront = useRef<CanvasRenderingContext2D | null>(null);

  const snapshot = useRef<StreamSnapshot | null>(null);
  const snapshotDirty = useRef(false);
  const queue = useRef<TributaryEvent[]>([]);
  const live = useRef(false);

  const pointer = useRef({ x: 0, y: 0, inside: false });
  const visible = useRef(true);
  const wakeUntil = useRef(0);
  const selfTest = useRef({ timer: 2200, step: 0, index: 0 });
  const debugTimer = useRef(0);
  const graphMs = useRef(0);

  // ------------------------------------------------------------------ sizing
  useEffect(() => {
    const resize = () => {
      const backCanvas = back.current;
      const frontCanvas = front.current;
      if (!backCanvas || !frontCanvas) return;

      let width: number;
      let height: number;
      let originX = 0;
      let originY = 0;
      let hostX = 0;
      let hostY = 0;

      if (host?.current) {
        const rect = host.current.getBoundingClientRect();
        width = Math.max(1, rect.width);
        height = Math.max(1, rect.height);
        hostX = rect.left;
        hostY = rect.top;
        fitCanvas(backCanvas, width, height);
        fitCanvas(frontCanvas, width, height);
        canvasSize.current = { width, height };
      } else {
        const canvasWidth = Math.max(1, window.innerWidth);
        const canvasHeight = Math.max(1, window.innerHeight);
        fitCanvas(backCanvas, canvasWidth, canvasHeight);
        fitCanvas(frontCanvas, canvasWidth, canvasHeight);
        canvasSize.current = { width: canvasWidth, height: canvasHeight };

        // The canvas is full bleed but the composition is framed inside the
        // shell's content area, so the vault never ends up behind the ledger
        // rail and no node hides under the top bar. The insets come from the
        // layout tokens, which is the contract for exactly this.
        const rail = readToken("--rail-w", 0);
        const chrome = readToken("--topbar-h", 44) + readToken("--banner-h", 22);
        // Below 1180px the rail rotates into a fixed 96px bottom ticker.
        const ticker = rail === 0 ? 96 : 0;
        originY = chrome;
        width = Math.max(360, canvasWidth - rail);
        height = Math.max(280, canvasHeight - chrome - ticker);
      }

      boxOrigin.current = { x: originX, y: originY };
      offset.current = { x: hostX + originX, y: hostY + originY };
      viewport.current = { width, height };
      ctxBack.current = backCanvas.getContext("2d");
      ctxFront.current = frontCanvas.getContext("2d");
      wakeUntil.current = performance.now() + WAKE_MS;
    };

    resize();

    // A DPR change is a resize the resize event never fires for.
    const dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    dprQuery.addEventListener("change", resize);
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);

    const observer = new ResizeObserver(resize);
    observer.observe(host?.current ?? document.documentElement);

    return () => {
      dprQuery.removeEventListener("change", resize);
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
      observer.disconnect();
    };
  }, [back, front, host]);

  // --------------------------------------------------------------- the stream
  useEffect(() => {
    // A producer that was already running before this stage mounted has proved
    // the wiring, so the self test stands down on history alone.
    if (stream.history(1).length > 0 || stream.snapshot().stats.paymentsTotal > 0) {
      live.current = true;
    }

    const offSnapshot = stream.onSnapshot((next) => {
      snapshot.current = next;
      snapshotDirty.current = true;
      if (next.stats.paymentsTotal > 0) live.current = true;
      wakeUntil.current = performance.now() + WAKE_MS;
    });
    const offEvents = stream.subscribe((event) => {
      queue.current.push(event);
      // A burst while the tab is hidden must not become a thousand pulses.
      if (queue.current.length > 240) queue.current.splice(0, queue.current.length - 240);
      live.current = true;
      wakeUntil.current = performance.now() + WAKE_MS;
    });
    return () => {
      offSnapshot();
      offEvents();
    };
  }, [stream]);

  // -------------------------------------------------------------- interaction
  useEffect(() => {
    const move = (event: PointerEvent) => {
      pointer.current.x = event.clientX;
      pointer.current.y = event.clientY;
      pointer.current.inside = true;
    };
    const leave = () => {
      pointer.current.inside = false;
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", leave);
    };
  }, []);

  // --------------------------------------------------- pause when off screen
  useEffect(() => {
    const element = host?.current;
    if (!element) {
      visible.current = true;
      return;
    }
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) visible.current = record.isIntersecting;
      },
      { threshold: 0 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [host]);

  // A scene change is a reason to repaint even when motion is off.
  useEffect(() => {
    wakeUntil.current = performance.now() + WAKE_MS;
  }, [camera.scene, scene, mode]);

  // ------------------------------------------------------------------- frame
  useTick((dt, now) => {
    const started = DEBUG ? performance.now() : 0;
    const world = worldRef.current;
    const vp = viewport.current;
    const backCtx = ctxBack.current;
    const frontCtx = ctxFront.current;
    if (!world || !backCtx || !frontCtx || vp.width < 2 || vp.height < 2) return;
    if (!visible.current) return;

    const reduced = motionRef.current === 0;
    const style = preset(modeRef.current);
    const cam = cameraRef.current;

    if (reduced) {
      cutCamera(cam, sceneRef.current);
      if (now > wakeUntil.current && queue.current.length === 0) return;
    } else {
      stepCamera(cam, sceneRef.current, dt);
    }

    // Zoom floor. 1180px is the design width at which a scene frame is exactly
    // right; anything narrower, a contained box or a laptop or a phone, scales up
    // so the composition still fills the frame instead of shrinking to a speck.
    // The stepped camera is untouched: only the view used for projection scales.
    const fit = clamp(1180 / vp.width, 1, host ? 3 : 2.2);
    const view = fit === 1 ? cam : { x: cam.x, y: cam.y, zoom: cam.zoom * fit };

    if (snapshotDirty.current && snapshot.current) {
      snapshotDirty.current = false;
      syncTopology(world, snapshot.current, { buyerKeep: style.buyerKeep });
    }

    syncAnchors(world, rects, view, vp, offset.current);

    if (queue.current.length > 0) {
      for (const event of queue.current) spawnFromEvent(world, event, reduced);
      queue.current.length = 0;
    }

    // Wiring self test: only while the stream has produced nothing at all.
    if (!live.current && !reduced && world.placeholder) {
      const test = selfTest.current;
      test.timer -= dt;
      if (test.timer <= 0) {
        spawnSelfTest(world, test.step, test.index);
        if (test.step === 0) {
          test.step = 1;
          test.timer = 900;
        } else {
          test.step = 0;
          test.index += 1;
          test.timer = 5200;
        }
      }
    }

    // Pointer, in scene space. Ambient stages never let the cursor push nodes.
    const wantsPointer = style.pointer && !reduced && pointer.current.inside;
    if (wantsPointer) {
      const local = screenToScene(
        view,
        pointer.current.x - offset.current.x,
        pointer.current.y - offset.current.y,
        vp,
      );
      world.pointer.x = local.x;
      world.pointer.y = local.y;
      world.pointer.active = true;
    } else {
      world.pointer.active = false;
    }

    // Hover, for the label. Nearest node within 26 screen pixels.
    if (style.labels && pointer.current.inside) {
      const p = projection(view, vp);
      const px = pointer.current.x - offset.current.x;
      const py = pointer.current.y - offset.current.y;
      let bestId: string | null = null;
      let bestDistance = 26;
      for (const node of world.nodes.values()) {
        if (node.role === "anchor") continue;
        const d = Math.hypot(node.x * p.scale + p.ox - px, node.y * p.scale + p.oy - py);
        if (d < bestDistance) {
          bestDistance = d;
          bestId = node.id;
        }
      }
      world.hover = bestId;
    } else {
      world.hover = null;
    }

    stepPhysics(world, dt, style.pointer ? PHYSICS : PHYSICS_AMBIENT, !reduced);
    stepPulses(world, dt, motionRef.current);

    // ------------------------------------------------------------ paint back
    // Phosphor persistence, both layers, both motion paths. Under reduced motion
    // nothing travels, so the decay has nothing to smear: the static layout is
    // repainted over itself while the stage is awake.
    // The clear covers the whole canvas; the drawing is translated into the box.
    const cs = canvasSize.current;
    const origin = boxOrigin.current;

    phosphorClear(backCtx, cs.width, cs.height);
    backCtx.save();
    backCtx.translate(origin.x, origin.y);
    drawEdges(backCtx, world, view, vp, { edge: style.edge });
    drawNodes(backCtx, world, view, vp, {
      node: style.node,
      aura: style.aura,
      layer: "back",
    });
    backCtx.restore();

    // ----------------------------------------------------------- paint front
    phosphorClear(frontCtx, cs.width, cs.height);
    frontCtx.save();
    frontCtx.translate(origin.x, origin.y);
    drawConnectors(frontCtx, world, view, vp, style.connector);
    drawPulses(frontCtx, world, view, vp, style.pulse);
    drawNodes(frontCtx, world, view, vp, {
      node: style.node,
      aura: 0,
      labels: style.labels,
      layer: "front",
    });
    frontCtx.restore();

    // The newest pulse doubles as a stand-in cursor for the dot grid, so the
    // interaction craft stays alive during a hands-off demo.
    const newest = world.pulses[world.pulses.length - 1];
    if (newest) {
      const edge = world.edges.get(newest.edgeId);
      const a = edge ? world.nodes.get(edge.from) : null;
      const b = edge ? world.nodes.get(edge.to) : null;
      if (a && b) {
        const p = projection(view, vp);
        const ax = a.x * p.scale + p.ox;
        const ay = a.y * p.scale + p.oy;
        const point = {
          x: ax + (b.x * p.scale + p.ox - ax) * newest.t + offset.current.x,
          y: ay + (b.y * p.scale + p.oy - ay) * newest.t + offset.current.y,
        };
        world.lastPulseScreen = point;
        if (primary) publishPulsePoint(point);
      }
    }

    if (DEBUG) {
      // The graph's own share of the frame, so a slow page can be attributed
      // instead of guessed at.
      graphMs.current = graphMs.current * 0.9 + (performance.now() - started) * 0.1;
    }

    if (DEBUG && debug?.current) {
      debugTimer.current -= dt;
      if (debugTimer.current <= 0) {
        debugTimer.current = 250;
        debug.current.textContent = [
          `FPS ${Math.round(fpsRef.current)}`,
          `GRAPH ${graphMs.current.toFixed(2)}ms`,
          `NODES ${world.nodes.size}`,
          `EDGES ${world.edges.size}`,
          `PULSES ${world.pulses.length}`,
          `SCENE ${sceneRef.current}`,
          `ZOOM ${view.zoom.toFixed(2)}`,
          `MODE ${modeRef.current}`,
          `STREAM ${stream.mode} ${stream.status}`,
          ...(!live.current && world.placeholder ? ["SELFTEST"] : []),
        ].join("  ");
      }
    }
  });

  return worldRef.current;
}

/**
 * Read a layout token off :root. Called on resize, never in the frame, because
 * getComputedStyle forces a style recalculation.
 */
function readToken(name: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
}

