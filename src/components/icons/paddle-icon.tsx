import { forwardRef } from 'react';

export const PaddleIcon = forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  ({ className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect x="6" y="1.5" width="11" height="14" rx="5" />
      <path d="M10 15.5v5.5" />
      <path d="M13 15.5v5.5" />
      <path d="M9 21h5" />
    </svg>
  )
);

PaddleIcon.displayName = 'PaddleIcon';
