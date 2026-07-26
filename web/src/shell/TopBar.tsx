/*
 * Site nav.
 *
 * Transparent over the hero, then it takes a backing once the page has moved
 * more than a nav's height. Logo left, section anchors in the middle, one mono
 * action on the right. Nothing here reads the payment stream, so the bar never
 * re-renders while money moves.
 */

import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

const SECTIONS = [
  { href: "#capabilities", label: "Capabilities" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#numbers", label: "Numbers" },
  { href: "#protocol", label: "Protocol" },
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
          <span className="nav-word-tag">CREDIT</span>
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
          <a
            className="nav-link nav-link-out"
            href="https://github.com/Takumixbt/tributary"
            target="_blank"
            rel="noreferrer"
          >
            Source
          </a>
          {onApp ? (
            <NavLink to="/" className="btn btn-sm">
              Back to site
            </NavLink>
          ) : (
            <NavLink to="/app" className="btn btn-sm">
              Launch App
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}

export default TopBar;
