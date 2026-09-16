import type { Profile } from "../hooks/useDashboardData";
import { avatarUrl } from "../features/settings/api";

type Props = { profile: Profile | null; size?: number; className?: string };

/** The user's photo, the design's photo for demo farms, or a placeholder. */
export function Avatar({ profile, size = 36, className = "" }: Props) {
  const style = { width: size, height: size };
  const src = profile?.avatarPath
    ? avatarUrl(profile.avatarPath)
    : profile?.organization.isDemo
      ? "/reference/avatar.png"
      : null;

  if (src) {
    return (
      <img
        className={`avatar ${className}`}
        style={style}
        src={src}
        alt={`${profile?.fullName ?? "Your"} profile photo`}
      />
    );
  }
  return (
    <span
      className={`avatar default-avatar ${className}`}
      style={style}
      aria-hidden="true"
    >
      <svg viewBox="0 0 36 36" width={size} height={size}>
        <circle cx="18" cy="14" r="6" />
        <path d="M6.5 31a11.5 11.5 0 0 1 23 0Z" />
      </svg>
    </span>
  );
}
