/*
 * Entry point. Integrator zone.
 *
 * Fonts are imported here rather than through CSS @import so Vite fingerprints
 * and preloads them as real assets. Two families, both variable, both
 * self-hosted: Figtree for everything typographic, Geist Mono for data.
 *
 * There is deliberately no StrictMode. This app runs one requestAnimationFrame
 * conductor and several imperative canvas engines; StrictMode's double-invoked
 * effects would start duplicate loops in development and hide real lifecycle
 * bugs behind doubled work.
 */

import "@fontsource-variable/figtree/index.css";
import "@fontsource-variable/geist-mono/index.css";

import "./styles/global.css";
import "./styles/shell.css";
import "./styles/theme.css";

import { createRoot } from "react-dom/client";
import App from "./App";

const container = document.getElementById("root");
if (!container) throw new Error("#root is missing from index.html");

createRoot(container).render(<App />);
