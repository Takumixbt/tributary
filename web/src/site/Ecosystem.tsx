import { reveal, useReveal } from "./useReveal";

const ROW_ONE = [
  { name: "Arc", role: "Settlement network" },
  { name: "USDC", role: "Unit of account" },
  { name: "Circle Gateway", role: "Payment settlement" },
  { name: "Nanopayments", role: "Sub-cent transfers" },
];

const ROW_TWO = [
  { name: "x402", role: "Payment standard" },
  { name: "CCTP", role: "Crosschain transfer" },
  { name: "ERC-8004", role: "Agent identity" },
  { name: "Arcscan", role: "Explorer" },
];

function Card({ name, role }: { name: string; role: string }) {
  return (
    <div className="shrink-0 px-8 py-6 border border-foreground/10 hover:border-foreground/30 hover:bg-foreground/[0.02] transition-all duration-300 group">
      <div className="text-lg font-medium group-hover:translate-x-1 transition-transform">
        {name}
      </div>
      <div className="text-sm text-muted-foreground">{role}</div>
    </div>
  );
}

function Run({ items }: { items: typeof ROW_ONE }) {
  return (
    <div className="flex gap-6 shrink-0">
      {items.map((item) => (
        <Card key={item.name} {...item} />
      ))}
    </div>
  );
}

export function Ecosystem() {
  const head = useReveal<HTMLDivElement>();

  return (
    <section id="integrations" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div
          ref={head.ref}
          className={`text-center max-w-3xl mx-auto mb-16 lg:mb-24 transition-all duration-700 ${reveal(head.shown, 8)}`}
        >
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            <span className="w-8 h-px bg-foreground/30" />
            Ecosystem
            <span className="w-8 h-px bg-foreground/30" />
          </span>
          <h2 className="text-4xl lg:text-6xl font-display tracking-tight mb-6">
            Runs on Arc.
            <br />
            Paid in USDC.
          </h2>
          <p className="text-xl text-muted-foreground">
            Money moves in one asset from end to end, so a loan, a payment and a repayment
            are all the same thing settling on the same network.
          </p>
        </div>
      </div>

      <div className="w-full mb-6">
        <div className="flex gap-6 marquee">
          <Run items={ROW_ONE} />
          <Run items={ROW_ONE} />
        </div>
      </div>

      <div className="w-full">
        <div className="flex gap-6 marquee-reverse">
          <Run items={ROW_TWO} />
          <Run items={ROW_TWO} />
        </div>
      </div>
    </section>
  );
}
