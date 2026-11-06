import type { SVGProps } from 'react';

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...p,
});

export const HomeIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 11l8-7 8 7v9H4z" /></svg>
);
export const TrainIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M3 12h18M6 8v8M18 8v8M3 10v4M21 10v4" /></svg>
);
export const ProgressIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M4 19l5-6 4 3 7-9" /></svg>
);
export const FoodIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><path d="M12 21c-4 0-7-3-7-8 0-3 2-6 7-6s7 3 7 6c0 5-3 8-7 8z" /><path d="M12 7c0-2 1-4 3-4" /></svg>
);
export const CheckIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ strokeWidth: 2.4, width: 20, height: 20, ...p })}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
export const BackIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ strokeWidth: 2, width: 20, height: 20, ...p })}><path d="M15 6l-6 6 6 6" /></svg>
);
export const NextIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ strokeWidth: 2, width: 20, height: 20, ...p })}><path d="M9 6l6 6-6 6" /></svg>
);
export const ExternalIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ strokeWidth: 2, width: 14, height: 14, ...p })}><path d="M7 17L17 7M9 7h8v8" /></svg>
);
export const ScaleIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><rect x="3" y="4" width="18" height="16" rx="4" /><path d="M8 9a4 4 0 0 1 8 0" /><path d="M12 9l1.5-2" /></svg>
);
export const PlusIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ strokeWidth: 2, width: 18, height: 18, ...p })}><path d="M12 5v14M5 12h14" /></svg>
);
export const TrashIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base({ width: 18, height: 18, ...p })}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
);
export const GearIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
);
