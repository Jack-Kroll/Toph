import type { IconName } from "./components/Icon";

export type NavItem = {
  label: string;
  icon: IconName;
  path: string;
  /** What the page will do; shown while it is under construction. */
  summary?: string;
};

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", icon: "dashboard", path: "/" },
      {
        label: "Activity Logs",
        icon: "audio",
        path: "/activity-logs",
        summary:
          "A complete, searchable history of every voice log, including the ones you've already reviewed.",
      },
      {
        label: "Map",
        icon: "map",
        path: "/map",
        summary:
          "A live satellite view of your fields with every recorded work location pinned.",
      },
    ],
  },
  {
    title: "Compliance",
    items: [
      {
        label: "Audit Manager",
        icon: "audit",
        path: "/audit-manager",
        summary:
          "Track chemical applications, rates, and re-entry intervals so you're ready for any audit.",
      },
      {
        label: "Reports",
        icon: "reports",
        path: "/reports",
        summary:
          "Exportable summaries of applications, hours worked, and activity by field.",
      },
      {
        label: "Schedule",
        icon: "calendar",
        path: "/schedule",
        summary:
          "Plan spraying, irrigation, and harvest work and assign it to your crew.",
      },
    ],
  },
  {
    title: "Team Management",
    items: [
      {
        label: "Employees",
        icon: "users",
        path: "/employees",
        summary: "Add workers, set their roles, and choose who is active.",
      },
      {
        label: "Performance",
        icon: "performance",
        path: "/performance",
        summary:
          "Response accuracy and activity trends for each member of your crew.",
      },
      {
        label: "Messages",
        icon: "mail",
        path: "/messages",
        summary: "Send instructions and follow-ups to workers in the field.",
      },
    ],
  },
  {
    title: "Other",
    items: [
      { label: "Settings", icon: "settings", path: "/settings" },
      {
        label: "Support",
        icon: "support",
        path: "/support",
        summary: "Help articles and a direct line to the Toph team.",
      },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);
