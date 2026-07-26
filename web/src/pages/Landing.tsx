/*
 * The landing page.
 *
 * Reading order, top to bottom:
 *
 *   Hero          tall opening frame, living graph, the claim, the stat strip
 *   Capabilities  four numbered rows: underwrite, repay, watch, yield
 *   How it works  the one inverted band, four steps
 *   Numbers       four live figures that count up once
 *   Ecosystem     what the loop is built on
 *   Security      the attack, and the three things that price it
 *   Protocol      the deployed addresses and one proven cycle
 *   CTA           one line and one button
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
