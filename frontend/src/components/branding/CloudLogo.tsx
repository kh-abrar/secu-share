// src/components/branding/CloudLogo.tsx
type Props = {
    /** Brand text shown next to the icon */
    label?: string;
    /** Extra classes for the wrapper */
    className?: string;
  };
  
  export function CloudLogo({ label = "SECURESHARE", className = "" }: Props) {
    return (
      <div className={`mb-6 flex w-full items-center justify-center gap-2 ${className}`}>
        <svg width="28" height="28" viewBox="0 0 48 48" className="drop-shadow-sm" aria-hidden="true">
          <defs>
            <linearGradient id="branding-g1" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#6EE7F9" />
              <stop offset="1" stopColor="#34D399" />
            </linearGradient>
          </defs>
          <path
            d="M17 34h16a9 9 0 0 0 0-18 11 11 0 0 0-21.2 3.4A7 7 0 0 0 17 34Z"
            fill="url(#branding-g1)"
          />
        </svg>
        <span className="text-xl font-semibold tracking-wide">{label}</span>
      </div>
    );
  }
  