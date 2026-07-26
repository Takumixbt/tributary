/*
 * The landing page. Zone: src/kinetic/**, src/pages/Landing.tsx and
 * src/pages/landing/**.
 *
 * Reading order, top to bottom, each narrative section wrapped in a
 * <GraphScene> so the camera reframes the one living simulation instead of
 * swapping visuals:
 *
 *   Hero          full-viewport graph, one claim, one metric strip
 *   Tape          the live payment strip, before any argument is made
 *   Manifesto     the single serif line, on inverted paper
 *   01 REVENUE    agents earn thousands of nanopayments
 *   02 SCORE      that history becomes a credit score
 *   03 CREDIT     the vault opens a line against future earnings
 *   04 REPAYMENT  the router splits every payment until the debt clears
 *   05 WHY ARC    the four properties the loop depends on
 *   06 THREAT     what an agent could do to us, and what it costs them
 *   CTA           follow the wire into the terminal
 */

import "./landing/landing.css";
import { GraphScene } from "../graph";
import { ANCHORS } from "../lib/stage";
import { Hero } from "./landing/Hero";
import { Manifesto } from "./landing/Manifesto";
import { LoopSection } from "./landing/LoopSection";
import { CreditInset, RepaymentInset, RevenueInset, ScoreInset } from "./landing/LoopInsets";
import { StatusStrip } from "./landing/StatusStrip";
import { ThreatModel } from "./landing/ThreatModel";
import { WhyArc } from "./landing/WhyArc";
import { CtaTerminal } from "./landing/CtaTerminal";

export function Landing() {
  return (
    <div className="landing">
      <GraphScene id="hero">
        <Hero />
      </GraphScene>

      <StatusStrip />

      <Manifesto />

      <GraphScene id="revenue">
        <LoopSection
          index={1}
          label="Revenue"
          title="Agents already earn in public"
          body="An agent selling over x402 gets paid per call, in USDC, thousands of times a day. That is the most transparent income statement a borrower has ever had: verifiable, real time, settled in under a second."
          note="Every call is a 402 challenge, a payment, then the work. Gateway sponsors the transfer, so a sub-cent call is still worth making."
          anchor={{ id: ANCHORS.secRevenue, bind: "buyers", side: "left" }}
        >
          <RevenueInset />
        </LoopSection>
      </GraphScene>

      <GraphScene id="score">
        <LoopSection
          index={2}
          label="Score"
          title="Revenue history becomes a credit score"
          body="An autonomous underwriter reads router telemetry and Gateway balances, posts a score from 0 to 1000 with its reasoning, and sizes a limit to observed cashflow. No collateral, no forms, no human in the loop."
          note="Inputs: revenue velocity, payment count, debt service ratio, missed splits, time since the first payment."
          anchor={{ id: ANCHORS.secScore, bind: "underwriter", side: "right" }}
        >
          <ScoreInset />
        </LoopSection>
      </GraphScene>

      <GraphScene id="credit">
        <LoopSection
          index={3}
          label="Credit"
          title="The vault lends against future earnings"
          body="Lenders deposit USDC. Agents draw working capital for the compute and the data a job needs before it pays. Interest accrues per second and lands in the share price, so a lender's position is one number that only moves one way while loans perform."
          note="Draws settle instantly against the line. There is no term, no rollover, and no liquidation, because there is nothing posted to liquidate."
          anchor={{ id: ANCHORS.secCredit, bind: "vault", side: "right" }}
        >
          <CreditInset />
        </LoopSection>
      </GraphScene>

      <GraphScene id="repayment">
        <LoopSection
          index={4}
          label="Repayment"
          title="The rail repays the loan, not a promise"
          body="Every payment the agent earns hits its RevenueRouter first. While debt is outstanding a fixed slice goes to the vault and the rest forwards on to the agent. Repayment is plumbing, not a promise."
          note="RevenueRouter.flush() splits at the line's repayment share, credits interest before principal, and clears the line the moment the balance hits zero."
          anchor={{ id: ANCHORS.secRepayment, bind: "router", side: "left" }}
        >
          <RepaymentInset />
        </LoopSection>
      </GraphScene>

      <WhyArc />
      <ThreatModel />

      <GraphScene id="dashboard">
        <CtaTerminal />
      </GraphScene>
    </div>
  );
}

export default Landing;
