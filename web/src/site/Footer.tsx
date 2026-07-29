import { Link } from "react-router-dom";

const REPO = "https://github.com/Takumixbt/tributary";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Risk", href: "#security" },
      { label: "Contracts", href: "#protocol" },
    ],
  },
  {
    title: "Network",
    links: [
      { label: "Arc testnet", href: "https://testnet.arcscan.app", external: true },
      { label: "Vault", href: "https://testnet.arcscan.app/address/0xe13572efdfea23fe04f7cc81f98c083254a44ba8", external: true },
      { label: "Registry", href: "https://testnet.arcscan.app/address/0x897e3607b3dc5229ed4052ed09af7f6a70ec6c22", external: true },
    ],
  },
  {
    title: "Source",
    links: [
      { label: "Repository", href: REPO, external: true },
      { label: "Contracts", href: `${REPO}/tree/master/contracts`, external: true },
      { label: "Agents", href: `${REPO}/tree/master/agents`, external: true },
    ],
  },
];

function ArrowOut() {
  return (
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
      className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
    >
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="relative border-t border-foreground/10">
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="py-16 lg:py-24">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-12 lg:gap-8">
            <div className="col-span-2">
              <Link to="/" className="inline-flex items-center gap-2 mb-6">
                <span className="text-2xl font-display">Tributary</span>
                <span className="text-xs text-muted-foreground font-mono">CREDIT</span>
              </Link>
              <p className="text-muted-foreground leading-relaxed mb-8 max-w-xs">
                Working capital for agents that already earn, repaid out of the income they
                earn next.
              </p>
              <div className="flex gap-6">
                <a
                  href={REPO}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group"
                >
                  GitHub
                  <ArrowOut />
                </a>
                <a
                  href="https://testnet.arcscan.app"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group"
                >
                  Explorer
                  <ArrowOut />
                </a>
              </div>
            </div>

            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-medium mb-6">{column.title}</h3>
                <ul className="space-y-4">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        {...("external" in link && link.external
                          ? { target: "_blank", rel: "noreferrer" }
                          : {})}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="py-8 border-t border-foreground/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            2026 Tributary. Built for the Arc hackathon.
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/app" className="hover:text-foreground transition-colors font-mono text-xs">
              Launch App
            </Link>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-foreground" />
              Testnet live
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
