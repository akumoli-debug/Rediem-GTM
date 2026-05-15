import Link from "next/link";

const navItems = [
  { href: "/accounts", label: "Accounts" },
  { href: "/people", label: "People" },
  { href: "/signals", label: "Signals" },
  { href: "/runs", label: "Runs" },
  { href: "/settings/providers", label: "Providers" },
  { href: "/settings/formulas", label: "Formulas" }
] as const;

export function WorkspaceShell({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner workspace-topbar">
          <Link className="brand" href="/">
            <strong>GTM Engine</strong>
            <span>Account Intelligence Workspace</span>
          </Link>
          <nav className="nav" aria-label="Workspace">
            {navItems.map((item) => (
              <Link className="nav-link" href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="workspace-main">
        <section className="workspace-title">
          <div>
            <p className="eyebrow">Workspace</p>
            <h1>{title}</h1>
            <p className="lede">{description}</p>
          </div>
        </section>
        {children}
      </main>
    </div>
  );
}
