/*
 * The landing page.
 *
 * Reading order, top to bottom:
 *
 *   Hero          tall opening frame, living graph, the claim, the stat strip
 *   Features      four numbered rows: read, repay, score, lend
 *   How it works  the one inverted band
 *   Stats         the real figures, counted up once
 *   Ecosystem     what it runs on
 *   Security      the attack, and what prices it
 *   Protocol      the deployed addresses and the proven cycle
 *   CTA           one line and one button
 *
 * Two rules hold across all of it. Every figure on this page is real and can be
 * opened in a block explorer: nothing here reads the demo simulator. And the
 * copy is written for a reader who has never heard of any of this, with the
 * precise terms confined to the contracts section.
 */

import { Hero } from "../site/Hero";
import { Features } from "../site/Features";
import { HowItWorks } from "../site/HowItWorks";
import { Stats } from "../site/Stats";
import { Ecosystem } from "../site/Ecosystem";
import { Security } from "../site/Security";
import { Protocol } from "../site/Protocol";
import { Cta } from "../site/Cta";

export default function Landing() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <Hero />
      <Features />
      <HowItWorks />
      <Stats />
      <Ecosystem />
      <Security />
      <Protocol />
      <Cta />
    </main>
  );
}
