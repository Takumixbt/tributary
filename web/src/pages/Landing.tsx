/*
 * The landing page.
 *
 * Reading order, top to bottom:
 *
 *   Hero          tall opening frame, living graph, the claim, the stat strip
 *   Capabilities  four numbered rows: read, repay, score, lend
 *   How it works  the one inverted band, four steps and the proven cycle
 *   Numbers       the four real figures, counted up once
 *   Ecosystem     what it runs on, two marquee rows
 *   Security      the attack, and the four things that price it
 *   Protocol      the deployed addresses and the proven cycle in full
 *   CTA           one line and one button
 *
 * Two rules hold across all of it. Every figure on this page is real and can be
 * opened in a block explorer: nothing here reads the demo simulator. And the
 * copy is written for a reader who has never heard of any of this, with the
 * precise terms confined to the contracts section.
 */

import "./landing/landing.css";
import { Hero } from "./landing/Hero";
import { Capabilities } from "./landing/Capabilities";
import { HowItWorks } from "./landing/HowItWorks";
import { Numbers } from "./landing/Numbers";
import { Ecosystem } from "./landing/Ecosystem";
import { Security } from "./landing/Security";
import { Protocol } from "./landing/Protocol";
import { CtaBand } from "./landing/CtaBand";

export function Landing() {
  return (
    <div className="landing">
      <Hero />
      <Capabilities />
      <HowItWorks />
      <Numbers />
      <Ecosystem />
      <Security />
      <Protocol />
      <CtaBand />
    </div>
  );
}

export default Landing;
