import Link from "next/link";

const navItems = [
  { href: "/rediem/accounts", label: "Accounts" },
  { href: "/rediem/import", label: "Import" },
  { href: "/rediem/playbooks", label: "Playbooks" },
  { href: "/rediem/formulas", label: "Formulas" },
  { href: "/runs", label: "Runs" }
] as const;

export function RediemShell({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell rediem-shell">
      <header className="rediem-topbar">
        <div className="topbar-inner workspace-topbar">
          <Link className="brand" href="/rediem/accounts">
            <strong>Rediem GTM Cockpit</strong>
            <span>Brand intelligence and activation fit</span>
          </Link>
          <nav className="nav" aria-label="Rediem workspace">
            {navItems.map((item) => (
              <Link className="nav-link" href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="workspace-main rediem-main">
        <section className="rediem-hero">
          <div>
            <p className="eyebrow">Rediem Intelligence</p>
            <h1>{title}</h1>
            <p className="lede">{description}</p>
          </div>
        </section>
        {children}
      </main>
    </div>
  );
}
