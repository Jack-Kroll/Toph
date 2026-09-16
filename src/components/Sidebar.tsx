import { useEffect, useState } from "react";
import { Icon, type IconName } from "./Icon";
import type { Profile } from "../hooks/useDashboardData";

const groups: { title: string; items: { label: string; icon: IconName }[] }[] =
  [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", icon: "dashboard" },
        { label: "Activity Logs", icon: "audio" },
        { label: "Map", icon: "map" },
      ],
    },
    {
      title: "Compliance",
      items: [
        { label: "Audit Manager", icon: "audit" },
        { label: "Reports", icon: "reports" },
        { label: "Schedule", icon: "calendar" },
      ],
    },
    {
      title: "Team Management",
      items: [
        { label: "Employees", icon: "users" },
        { label: "Performance", icon: "performance" },
        { label: "Messages", icon: "mail" },
      ],
    },
    {
      title: "Other",
      items: [
        { label: "Settings", icon: "settings" },
        { label: "Support", icon: "support" },
      ],
    },
  ];

type Props = {
  profile: Profile | null;
  email: string;
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
        <img
          className="avatar"
          src="/reference/avatar.png"
          alt={`${profile?.organization.name ?? "Farm"} profile`}
        />
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
            <span className="account-email">{email}</span>
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
            <button onClick={onSignOut}>Log out</button>
          </div>
        )}
      </div>
      <nav>
        {groups.map((group) => (
          <div className="nav-group" key={group.title}>
            <h2>{group.title}</h2>
            {group.items.map((item) => {
              const active = item.label === "Dashboard";
              return (
                <button
                  key={item.label}
                  aria-label={item.label}
                  className={`nav-item ${active ? "active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  aria-disabled={!active}
                  title={active ? undefined : `${item.label} — coming soon`}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                  {active && newCount > 0 && (
                    <span
                      className="notification-count"
                      aria-label={`${newCount} new today`}
                    >
                      {newCount}
                    </span>
                  )}
                </button>
              );
            })}
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
