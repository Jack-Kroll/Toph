import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router";
import { ConstructionIllustration } from "../components/ConstructionIllustration";
import { Icon } from "../components/Icon";
import { NAV_GROUPS } from "../navigation";

export function UnderConstructionPage() {
  const { section } = useParams();
  const group = NAV_GROUPS.find((g) =>
    g.items.some((item) => item.path === `/${section}`),
  );
  const item = group?.items.find((i) => i.path === `/${section}`);

  useEffect(() => {
    if (item) document.title = `${item.label} · Toph`;
  }, [item]);

  if (!group || !item?.summary) return <Navigate to="/" replace />;

  return (
    <main className="main-content">
      <header className="page-header">
        <div>
          <h1>{item.label}</h1>
          <p>{group.title}</p>
        </div>
      </header>
      <section className="construction-card" aria-labelledby="construction-title">
        <ConstructionIllustration />
        <span className="construction-badge">
          <Icon name={item.icon} size={13} />
          Under construction
        </span>
        <h2 id="construction-title">{item.label} is on its way</h2>
        <p>{item.summary}</p>
        <p className="construction-note">
          We're still building this page. Everything on the dashboard works
          today.
        </p>
        <Link to="/" className="primary-button construction-link">
          <Icon name="dashboard" size={15} />
          Back to Dashboard
        </Link>
      </section>
    </main>
  );
}
