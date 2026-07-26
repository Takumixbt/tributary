/*
 * What it runs on. Zone: src/pages/landing/**.
 *
 * The reference's integrations block, copied: a centred head with the eyebrow
 * ruled on both sides, then two full-bleed rows of bordered cards travelling in
 * opposite directions. Name on top, one plain line underneath. No claims, no
 * adjectives, no infrastructure trivia.
 */

import { Marquee } from "../../kinetic";
import { SectionHead } from "./bits";
import "./landing.css";

interface Piece {
  name: string;
  role: string;
}

const ROW_ONE: Piece[] = [
  { name: "Arc", role: "The network it settles on" },
  { name: "USDC", role: "The money" },
  { name: "Circle Gateway", role: "Moves the payments" },
  { name: "Pay per request", role: "How agents charge" },
  { name: "Agent identity", role: "Who the score belongs to" },
];

const ROW_TWO: Piece[] = [
  { name: "Solidity", role: "The contracts" },
  { name: "Foundry", role: "The tests" },
  { name: "viem", role: "Reads the chain" },
  { name: "React", role: "This page" },
  { name: "Arcscan", role: "Check our work" },
];

function Card({ piece }: { piece: Piece }) {
  return (
    <div className="eco-card">
      <div className="eco-name">{piece.name}</div>
      <div className="eco-role">{piece.role}</div>
    </div>
  );
}

export function Ecosystem() {
  return (
    <section className="sec eco" id="built-on">
      <div className="col">
        <SectionHead
          center
          eyebrow="Built on"
          title="Runs on Arc."
          titleDim="Paid in USDC."
          intro="One asset the whole way through. Nothing here needs a bridge, a wrapper or a second token."
        />
      </div>

      <div className="eco-rows">
        <Marquee speed={30} label="What Tributary is built on">
          {ROW_ONE.map((piece) => (
            <Card key={piece.name} piece={piece} />
          ))}
        </Marquee>
        <Marquee speed={26} reverse label="What Tributary is built with">
          {ROW_TWO.map((piece) => (
            <Card key={piece.name} piece={piece} />
          ))}
        </Marquee>
      </div>
    </section>
  );
}

export default Ecosystem;
