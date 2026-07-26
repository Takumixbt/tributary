/*
 * Scroll as camera. Zone: src/graph/**.
 *
 * scrollY and the active <GraphScene> drive a lerped camera over one simulation.
 * The graph never unmounts and never hides: the page is a tour of a living
 * system. Use damp(), not lerp(), so the pan feels identical at 60 and 144Hz.
 */

import { damp } from "../lib/motion";
import { SCENE_BOX, SCENE_FRAMES, type SceneId } from "../lib/stage";

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export function createCamera(scene: SceneId = "hero"): Camera {
  return { ...SCENE_FRAMES[scene] };
}

/** Approach the active scene's frame. halfLife 260ms reads as deliberate. */
export function stepCamera(camera: Camera, scene: SceneId, dtMs: number, halfLife = 260): void {
  const target = SCENE_FRAMES[scene];
  camera.x = damp(camera.x, target.x, halfLife, dtMs);
  camera.y = damp(camera.y, target.y, halfLife, dtMs);
  camera.zoom = damp(camera.zoom, target.zoom, halfLife, dtMs);
}

/** Reduced motion cuts between scenes instead of panning. */
export function cutCamera(camera: Camera, scene: SceneId): void {
  const target = SCENE_FRAMES[scene];
  camera.x = target.x;
  camera.y = target.y;
  camera.zoom = target.zoom;
}

/**
 * Scene units per screen pixel, plus the screen origin of scene (0, 0).
 * Renderers take this once per frame and project inline, so the conversion still
 * lives in exactly one file while thirty nodes across four layers stay cheap.
 *
 *   const p = projection(camera, viewport);
 *   const sx = node.x * p.scale + p.ox;
 */
export interface Projection {
  scale: number;
  ox: number;
  oy: number;
}

export function projection(
  camera: Camera,
  viewport: { width: number; height: number },
): Projection {
  const scale = (viewport.width / SCENE_BOX.width) * camera.zoom;
  return {
    scale,
    ox: viewport.width / 2 - camera.x * scale,
    oy: viewport.height / 2 - camera.y * scale,
  };
}

/** Scene space to screen pixels. The only place this conversion may live. */
export function sceneToScreen(
  camera: Camera,
  x: number,
  y: number,
  viewport: { width: number; height: number },
): { x: number; y: number } {
  const scale = (viewport.width / SCENE_BOX.width) * camera.zoom;
  return {
    x: viewport.width / 2 + (x - camera.x) * scale,
    y: viewport.height / 2 + (y - camera.y) * scale,
  };
}

/** Screen pixels back to scene space. Needed to place anchored edge endpoints. */
export function screenToScene(
  camera: Camera,
  x: number,
  y: number,
  viewport: { width: number; height: number },
): { x: number; y: number } {
  const scale = (viewport.width / SCENE_BOX.width) * camera.zoom;
  return {
    x: camera.x + (x - viewport.width / 2) / scale,
    y: camera.y + (y - viewport.height / 2) / scale,
  };
}