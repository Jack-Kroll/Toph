import { useEffect, useState } from "react";
import { NavLink } from "react-router";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { NAV_GROUPS } from "../navigation";
import type { Profile } from "../hooks/useDashboardData";

type Props = {
  profile: Profile | null;
  email: string | null;
  newCount: number;
  onSignOut: () => void;
  onResetDemo: () => void;
};

export function Sidebar({
  profile,
  email,
  newCount,
  onSignOut,
  onResetDemo,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);
  const role = profile
    ? profile.role[0].toUpperCase() + profile.role.slice(1)
    : "";

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="account popover-anchor">
        <Avatar profile={profile} />
        <div className="account-text">
          <strong>{profile?.organization.name ?? " "}</strong>
          <span>
            <Icon name="users" size={11} /> {role}
          </span>
        </div>
        <button
          className="icon-button inbox"
          aria-label="Account menu"
          aria-expanded={menuOpen}
          onClick={(event) => {
            event.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
        >
          <Icon name="inbox" size={16} />
        </button>
        {menuOpen && (
          <div
            className="popover account-menu"
            onClick={(event) => event.stopPropagation()}
          >
            <p>{profile?.fullName}</p>
            <span className="account-email">
              {email ?? "Private demo in this browser"}
            </span>
            {profile?.organization.isDemo && profile.role === "admin" && (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onResetDemo();
                }}
              >
                Reset demo data
              </button>
            )}
            {!email && (
              <span className="account-hint">
                Logging out ends this demo. Starting the demo again creates a
                fresh farm.
              </span>
            )}
            <button onClick={onSignOut}>Log out</button>
          </div>
        )}
      </div>
      <nav>
        {NAV_GROUPS.map((group) => (
          <div className="nav-group" key={group.title}>
            <h2>{group.title}</h2>
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end
                aria-label={item.label}
                title={item.summary ? `${item.label} (coming soon)` : undefined}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.path === "/" && newCount > 0 && (
                  <span
                    className="notification-count"
                    aria-label={`${newCount} new today`}
                  >
                    {newCount}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="account-actions">
        <button
          className="nav-item"
          aria-label="Switch User"
          title="Sign in as a different user"
          onClick={onSignOut}
        >
          <Icon name="switch" />
          <span>Switch User</span>
        </button>
        <button className="nav-item" aria-label="Log Out" onClick={onSignOut}>
          <Icon name="logout" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
