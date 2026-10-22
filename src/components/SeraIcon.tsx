type IconName = 'flower' | 'bag' | 'list' | 'admin' | 'search' | 'plus' | 'eye';

const PATHS: Record<IconName, string[]> = {
  flower: [
    'M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5',
    'M12 7.5V9',
    'M7.5 12H9',
    'M16.5 12H15',
    'M12 16.5V15',
  ],
  bag: ['M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z', 'M3 6h18', 'M16 10a4 4 0 0 1-8 0'],
  list: [
    'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2',
    'M12 11h4',
    'M12 16h4',
    'M8 11h.01',
    'M8 16h.01',
  ],
  admin: [
    'M21 4h-7',
    'M10 4H3',
    'M21 12h-9',
    'M8 12H3',
    'M21 20h-5',
    'M12 20H3',
    'M14 2v4',
    'M8 10v4',
    'M16 18v4',
  ],
  search: ['m21 21-4.3-4.3'],
  plus: ['M5 12h14', 'M12 5v14'],
  eye: [
    'M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0',
  ],
};

type Props = {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

/** Lucide-style line icons (paths from lucide.dev, ISC licence). Decorative only. */
export function SeraIcon({ name, size = 22, strokeWidth = 1.75, className }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {name === 'flower' ? <circle cx="12" cy="12" r="3" /> : null}
      {name === 'search' ? <circle cx="11" cy="11" r="8" /> : null}
      {name === 'eye' ? <circle cx="12" cy="12" r="3" /> : null}
      {name === 'list' ? <rect width="8" height="4" x="8" y="2" rx="1" /> : null}
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
