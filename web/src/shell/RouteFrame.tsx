/*
 * Route hand-off.
 *
 * One settle keyed on the path, plus the scroll reset a single-page app has to
 * do for itself. It uses the same ramp as the scroll reveals, so arriving on a
 * route and scrolling down it feel like the same page. Under reduced motion the
 * duration tokens collapse to 1ms and the settle becomes a cut.
 */

import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

export function RouteFrame({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  // Opening the terminal from the middle of the story must not land mid desk.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return (
    <div className="route" key={pathname} data-route={pathname}>
      {children}
    </div>
  );
}

export default RouteFrame;
