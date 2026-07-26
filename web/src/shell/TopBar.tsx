/*
 * Site nav.
 *
 * Wordmark left, a few quiet anchors, one pill on the right. Nothing else: no
 * tag beside the logo, no second action, no decoration.
 *
 * It is transparent over the hero and takes a blurred backing once the page has
 * moved more than a nav's height. It is the highest layer in the shell, so the
 * marquee, the graph canvases and every count-up pass underneath it. Nothing
 * here reads the payment stream, so the bar never re-renders while money moves.
 */

import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

const SECTIONS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#numbers", label: "Numbers" },
  { href: "/#protocol", label: "Contracts" },
];

export function TopBar() {
  const onApp = useLocation().pathname.startsWith("/app");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 64);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="nav" data-scrolled={scrolled ? "1" : undefined}>
      <div className="nav-inner">
        <Link to="/" className="nav-brand" aria-label="Tributary home">
          <span className="nav-word">Tributary</span>
        </Link>

        {onApp ? null : (
          <nav className="nav-links" aria-label="Sections">
            {SECTIONS.map((section) => (
              <a key={section.href} className="nav-link" href={section.href}>
                {section.label}
              </a>
            ))}
          </nav>
        )}

        <div className="nav-actions">
          {onApp ? (
            <NavLink to="/" className="btn btn-primary btn-sm">
              Back to site
            </NavLink>
          ) : (
            <NavLink to="/app" className="btn btn-primary btn-sm">
              Launch App
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}

export default TopBar;
