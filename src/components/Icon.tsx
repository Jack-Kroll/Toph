import type { ReactNode } from "react";

export type IconName =
  | "dashboard"
  | "audio"
  | "map"
  | "audit"
  | "reports"
  | "calendar"
  | "users"
  | "performance"
  | "mail"
  | "settings"
  | "support"
  | "switch"
  | "logout"
  | "search"
  | "inbox"
  | "sort"
  | "filter"
  | "close"
  | "play"
  | "pause"
  | "star"
  | "expand"
  | "worker"
  | "percent"
  | "check"
  | "plus"
  | "edit"
  | "trash";

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    dashboard: (
      <>
        <path d="M4 3v17h17" />
        <path d="m7 13 4-4 4 3 5-6" />
      </>
    ),
    audio: (
      <>
        <path d="M4 10v4m4-7v10m4-13v16m4-13v10m4-7v4" />
      </>
    ),
    map: (
      <>
        <path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Z" />
        <path d="M9 3v16M15 5v16" />
      </>
    ),
    audit: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="1.5" />
        <path d="m8 9 2 2 5-5M8 16h7" />
      </>
    ),
    reports: (
      <>
        <path d="M9 3h7l4 4v11H9zM16 3v5h4" />
        <path d="M5 7H3v14h12v-1" />
      </>
    ),
    calendar: (
      <>
        <rect x="4" y="5" width="16" height="16" rx="2" />
        <path d="M8 3v5m8-5v5M4 11h16" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="7" r="3" />
        <path d="M3 20v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5" />
      </>
    ),
    performance: (
      <>
        <path d="M11 3a9 9 0 1 0 10 10H11Z" />
        <path d="M15 3v6h6a8 8 0 0 0-6-6Z" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 6 9 7 9-7" />
      </>
    ),
    settings: (
      <>
        <path d="m10 3-.7 2.2-2 .9-2.1-.5L3 9l1.5 1.7v2.5L3 15l2.2 3.4 2.1-.5 2 .9.7 2.2h4l.7-2.2 2-.9 2.1.5L21 15l-1.5-1.8v-2.5L21 9l-2.2-3.4-2.1.5-2-.9L14 3Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    support: (
      <>
        <path d="m12 4 3 2 5-1 1 7-9 9-9-9 1-7 5 1Z" />
        <path d="m7 9 3-1 3 2-2 2 4 4m-9-4 5 5" />
      </>
    ),
    switch: (
      <>
        <path d="M4 8h15l-3-3m4 11H5l3 3M19 8l-3 3M5 16l3-3" />
      </>
    ),
    logout: (
      <>
        <path d="M10 4H4v16h6m4-12 4 4-4 4m-6-4h10" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    inbox: (
      <>
        <path d="m6 5-3 8v6h18v-6l-3-8Z" />
        <path d="M3 13h5l2 3h4l2-3h5" />
      </>
    ),
    sort: <path d="M4 6h16M7 12h10m-7 6h4" />,
    filter: <path d="M3 4h18l-7 9v7l-4-2v-5Z" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    play: <path d="m7 4 13 8-13 8Z" />,
    pause: (
      <>
        <path d="M8 5v14M16 5v14" />
      </>
    ),
    star: (
      <path d="m12 3 2.8 5.6 6.2.9-4.5 4.4 1.1 6.1-5.6-2.9L6.4 20l1.1-6.1L3 9.5l6.2-.9Z" />
    ),
    expand: (
      <path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6M3 3l6 6m12-6-6 6M3 21l6-6m12 6-6-6" />
    ),
    worker: (
      <>
        <path d="M5 21v-6m-1-4V7a6 6 0 0 1 12 0v5l3 2h-3v4h-5l-2 3" />
        <path d="m3 14 7-7 3 3-7 7-3 1Z" />
      </>
    ),
    percent: (
      <>
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="18" cy="18" r="2.5" />
        <path d="m5 20 14-16" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    plus: <path d="M12 5v14M5 12h14" />,
    edit: <path d="M4 20h4L19 9l-4-4L4 16Z" />,
    trash: <path d="M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

