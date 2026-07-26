/*
 * Camera control. Zone: src/graph/**.
 *
 * Other zones do not move the camera imperatively. They wrap a section in
 * <GraphScene id="repayment"> and the camera follows when that section owns the
 * viewport. Scroll is a camera, never an exit.
 *
 * The observer is deliberately keyed on the scene id alone. Keying it on the
 * camera object would tear down and rebuild every observer on every scene change,
 * and two sections straddling the trigger band would then hand the scene back and
 * forth forever.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { SceneId } from "../lib/stage";

interface CameraApi {
  /** The scene the camera is currently moving toward. */
  scene: SceneId;
  /** Imperative override. Use only for the CTA hand-off, not for scrolling. */
  focus(scene: SceneId): void;
}

const CameraContext = createContext<CameraApi | null>(null);

export function GraphCameraProvider({ children }: { children: ReactNode }) {
  const [scene, setScene] = useState<SceneId>("hero");
  const value = useMemo<CameraApi>(() => ({ scene, focus: setScene }), [scene]);
  return <CameraContext.Provider value={value}>{children}</CameraContext.Provider>;
}

export function useGraphCamera(): CameraApi {
  return useContext(CameraContext) ?? { scene: "hero", focus: () => {} };
}

/**
 * Wrap a narrative section. When it crosses the middle of the viewport, the
 * camera reframes the simulation to that scene.
 */
export function GraphScene({
  id,
  children,
  className,
}: {
  id: SceneId;
  children: ReactNode;
  className?: string;
}) {
  const camera = useGraphCamera();
  const ref = useRef<HTMLDivElement | null>(null);
  const focus = useRef(camera.focus);
  focus.current = camera.focus;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (record.isIntersecting) focus.current(id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [id]);

  return (
    <div ref={ref} className={className} data-graph-scene={id}>
      {children}
    </div>
  );
}
