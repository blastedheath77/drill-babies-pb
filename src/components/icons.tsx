import type { SVGProps } from 'react';

export const Icons = {
  PickleballPaddle: (props: SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.12.88a9.1 9.1 0 0 0-12.88 0L3.2 5.92a9.1 9.1 0 0 0 12.88 12.88l4.95-4.95a9.1 9.1 0 0 0 0-12.88Z" />
      <path d="M19.71 2.29a3.25 3.25 0 0 0-4.6 0l-2.83 2.83a3.25 3.25 0 0 0 4.6 4.6l2.83-2.83a3.25 3.25 0 0 0 0-4.6Z" />
    </svg>
  ),
  Menu: (props: SVGProps<SVGSVGElement>) => (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  ),
};
