import { useEffect, useRef, useState } from "react";

/**
 * Scroll reveal. Elements ship in their hidden state and settle once, the
 * first time they enter the viewport. One observer per element, no work
 * after it fires.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || shown) return;

    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shown, threshold]);

  return { ref, shown };
}

/** The two-state class pair the reference uses for every reveal. */
export function reveal(shown: boolean, distance: 4 | 8 | 12 = 4) {
  return shown ? "opacity-100 translate-y-0" : `opacity-0 translate-y-${distance}`;
}
