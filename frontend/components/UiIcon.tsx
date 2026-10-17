import type { CSSProperties } from 'react';

const paths = {
  bike: (
    <>
      <circle cx="5" cy="17" r="4" />
      <circle cx="19" cy="17" r="4" />
      <path d="m5 17 5-9 5 9H5m5-9 4 1 5 8M9 5h4m1 4 2-4h3" />
    </>
  ),
  paw: (
    <>
      <ellipse cx="12" cy="16" rx="6" ry="5" />
      <ellipse cx="5" cy="9" rx="2" ry="3" transform="rotate(-25 5 9)" />
      <ellipse cx="10" cy="5" rx="2" ry="3" />
      <ellipse cx="16" cy="5" rx="2" ry="3" />
      <ellipse cx="21" cy="10" rx="2" ry="3" transform="rotate(25 21 10)" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2m-8 3h2" />
    </>
  ),
  faq: (
    <>
      <path d="M8 9a4 4 0 0 1 8 0c0 3-4 3-4 6M12 18h.01" />
      <circle cx="12" cy="12" r="10" />
    </>
  ),
  contact: (
    <>
      <rect x="4" y="5" width="17" height="16" rx="2" />
      <path d="M8 3v4m9-4v4m-2 7h3m-3 3h3M7 18v-1a3 3 0 0 1 6 0v1" />
      <circle cx="10" cy="12" r="2" />
    </>
  ),
  services: (
    <>
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M8 7V4h8v3M3 12a25 25 0 0 0 18 0M12 11v4" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8" cy="8" r="1.5" />
      <path d="m3 17 5-5 4 4 4-6 5 7" />
    </>
  ),
  phone: (
    <path d="m5 3 4 1 1 5-3 2a15 15 0 0 0 6 6l2-3 5 1 1 4a2 2 0 0 1-2 2C10 21 3 14 3 5a2 2 0 0 1 2-2Z" />
  ),
  chat: (
    <>
      <path d="M21 14a3 3 0 0 1-3 3H8l-5 4V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8Z" />
      <path d="M7 8h10M7 12h7" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="13" height="13" rx="2" />
      <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
    </>
  ),
  tag: (
    <>
      <path d="M3 3h7l11 11-7 7L3 10V3Z" />
      <circle cx="7" cy="7" r="1" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  chevron: <path d="m9 5 7 7-7 7" />,
  down: <path d="m5 9 7 7 7-7" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  more: (
    <>
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21v-3a8 8 0 0 1 16 0v3" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="5" width="18" height="15" rx="2" />
      <path d="M3 9h18M16 13h5" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
    </>
  ),
  star: (
    <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L2.2 9.4l6.1-.9L12 3Z" />
  ),
  tick: <path d="m5 12 4 4 10-10" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 6 9 7 9-7" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="m3 3 18 18M10.6 5.1A12 12 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-3 3.9M6.1 6.1A19 19 0 0 0 2 12s3.5 7 10 7a12 12 0 0 0 5.9-1.9M10 10a3 3 0 0 0 4 4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  zap: <path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z" />,
  edit: (
    <>
      <path d="m16 3 5 5-12 12-6 1 1-6L16 3ZM13 6l5 5" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18M7 14l5-5 4 3 5-7M17 5h4v4" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
} as const;
export type UiIconName = keyof typeof paths;

export function UiIcon({
  name,
  style,
}: {
  name: UiIconName;
  style?: CSSProperties;
}) {
  return (
    <svg
      className="ui-icon"
      style={style}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
