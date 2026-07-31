import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Mark } from "./Mark";

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#security", label: "Risk" },
  { href: "#protocol", label: "Contracts" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header
        className={`fixed z-50 transition-all duration-500 top-0 left-0 right-0 ${
          scrolled ? "pt-4 px-4" : "pt-0 px-0"
        }`}
      >
        <nav
          className={`mx-auto transition-all duration-500 ${
            scrolled
              ? "max-w-[1200px] rounded-full bg-background/85 backdrop-blur-md border border-foreground/10"
              : "max-w-[1400px] bg-transparent border border-transparent"
          }`}
        >
          <div
            className={`flex items-center justify-between transition-all duration-500 px-6 lg:px-8 ${
              scrolled ? "h-14" : "h-16"
            }`}
          >
            <Link className="flex items-center gap-2.5" to="/">
              <Mark className="w-5 h-5" />
              <span className="font-display font-semibold tracking-tight transition-all duration-500 text-xl">
                Tributary
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 font-mono text-xs text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/app"
                className="font-mono border border-foreground/20 hover:border-foreground/60 hover:bg-foreground/5 transition-all duration-300 px-4 py-2 text-xs rounded-full"
              >
                Launch App
              </Link>
            </div>

            <button
              className="md:hidden p-2"
              aria-label="Toggle menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6"
              >
                {menuOpen ? (
                  <>
                    <line x1="18" x2="6" y1="6" y2="18" />
                    <line x1="6" x2="18" y1="6" y2="18" />
                  </>
                ) : (
                  <>
                    <line x1="4" x2="20" y1="12" y2="12" />
                    <line x1="4" x2="20" y1="6" y2="6" />
                    <line x1="4" x2="20" y1="18" y2="18" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </nav>
      </header>

      <div
        className={`md:hidden fixed inset-0 bg-background z-40 transition-all duration-500 ${
          menuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex flex-col h-full px-8 pt-28 pb-8">
          <div className="flex-1 flex flex-col justify-center gap-8">
            {LINKS.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`text-4xl font-display text-foreground hover:text-muted-foreground transition-all duration-500 ${
                  menuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                {link.label}
              </a>
            ))}
          </div>
          <div
            className={`flex flex-col gap-3 pt-8 border-t border-foreground/10 transition-all duration-500 ${
              menuOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "180ms" }}
          >
            <Link
              to="/app"
              onClick={() => setMenuOpen(false)}
              className="w-full border border-foreground/20 h-14 text-base font-mono hover:bg-foreground/5 transition-colors flex items-center justify-center"
            >
              Launch App
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
