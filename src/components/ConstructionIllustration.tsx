/** A small farm scene with a road barrier, drawn to match the app palette. */
export function ConstructionIllustration() {
  return (
    <svg
      className="construction-art"
      viewBox="0 0 360 230"
      role="img"
      aria-label="A tractor parked in a field behind a construction barrier"
    >
      <defs>
        <clipPath id="construction-clip">
          <rect width="360" height="230" rx="20" />
        </clipPath>
        <pattern
          id="construction-stripes"
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="16" height="16" fill="#f2b233" />
          <rect width="8" height="16" fill="#2f2f2f" />
        </pattern>
      </defs>
      <g clipPath="url(#construction-clip)">
        <rect width="360" height="230" fill="#eef5f1" />
        <circle cx="292" cy="52" r="22" fill="#f7d98b" />
        <g fill="#fff">
          <ellipse cx="84" cy="52" rx="28" ry="10" />
          <ellipse cx="102" cy="45" rx="18" ry="11" />
          <ellipse cx="196" cy="34" rx="20" ry="7" />
        </g>

        <path
          d="M0 132C60 104 120 110 180 124S300 104 360 120V230H0Z"
          fill="#d5e6dc"
        />
        <g transform="translate(232 92)">
          <path d="M0 22 22 4l22 18v30H0Z" fill="#c2644c" />
          <path
            d="M-3 24 22 2l25 22"
            fill="none"
            stroke="#8f4332"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="15" y="32" width="14" height="20" fill="#f6efe6" />
          <path d="m15 32 14 20m0-20L15 52" stroke="#c2644c" strokeWidth="2" />
          <rect x="18" y="14" width="8" height="8" fill="#f6efe6" />
        </g>
        <rect x="282" y="98" width="14" height="46" fill="#b9c7c0" />
        <path d="M282 98a7 7 0 0 1 14 0Z" fill="#9fb1a8" />

        <path d="M0 158C90 136 200 140 360 150V230H0Z" fill="#a9c9b5" />
        <g fill="none" stroke="#93bba2" strokeWidth="3" strokeLinecap="round">
          <path d="M0 176C100 158 220 160 360 170" />
          <path d="M0 194C100 176 220 178 360 188" />
          <path d="M0 212C100 194 220 196 360 206" />
          <path d="M0 230C100 212 220 214 360 224" />
        </g>

        <g transform="translate(40 126)">
          <circle cx="34" cy="0" r="5" fill="#fff" opacity="0.9" />
          <circle cx="42" cy="-9" r="6" fill="#fff" opacity="0.7" />
          <rect x="30" y="6" width="4" height="16" rx="1" fill="#2f5249" />
          <path d="M18 22h40V10h28v30H18Z" fill="#426e63" />
          <rect x="54" y="5" width="36" height="6" rx="2" fill="#2f5249" />
          <rect x="63" y="15" width="17" height="13" rx="2" fill="#dff0e8" />
          <circle cx="76" cy="44" r="16" fill="#2b2b2b" />
          <circle cx="76" cy="44" r="6" fill="#f2b233" />
          <circle cx="28" cy="48" r="10" fill="#2b2b2b" />
          <circle cx="28" cy="48" r="4" fill="#f2b233" />
        </g>

        <g>
          <rect x="212" y="164" width="5" height="40" fill="#6b6b6b" />
          <rect x="283" y="164" width="5" height="40" fill="#6b6b6b" />
          <rect x="204" y="201" width="21" height="6" rx="2" fill="#555" />
          <rect x="275" y="201" width="21" height="6" rx="2" fill="#555" />
          <rect
            x="198"
            y="158"
            width="104"
            height="18"
            rx="3"
            fill="url(#construction-stripes)"
          />
          <rect
            x="206"
            y="182"
            width="88"
            height="12"
            rx="3"
            fill="url(#construction-stripes)"
          />
          <circle cx="206" cy="152" r="5" fill="#f08a3c" />
          <circle cx="294" cy="152" r="5" fill="#f08a3c" />
        </g>

        <g>
          <path d="m312 204 10-38 10 38Z" fill="#f08a3c" />
          <path d="M319.6 175h4.8l1.3 5h-7.4Z" fill="#fff" />
          <path d="M316.5 187h11l1.6 6h-14.2Z" fill="#fff" />
          <rect x="306" y="202" width="32" height="6" rx="2" fill="#d9712a" />
        </g>
      </g>
    </svg>
  );
}
