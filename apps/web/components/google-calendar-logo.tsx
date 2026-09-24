import React from "react";

interface GoogleCalendarLogoProps {
  className?: string;
  size?: number;
}

/**
 * Official Google Workspace Calendar vector mark matching Google's brand icon.
 */
export function GoogleCalendarLogo({ className = "h-8 w-8", size }: GoogleCalendarLogoProps) {
  return (
    <svg
      viewBox="0 0 192 192"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Google Calendar"
    >
      <defs>
        <clipPath id="gcal-clip">
          <rect x="24" y="24" width="144" height="144" rx="28" />
        </clipPath>
      </defs>

      <g clipPath="url(#gcal-clip)">
        {/* Base Canvas */}
        <rect x="24" y="24" width="144" height="144" fill="#FFFFFF" />

        {/* Right Yellow Section */}
        <path d="M134 24H168V168H134V24Z" fill="#FBBC04" />

        {/* Bottom Green Section */}
        <path d="M24 134H168V168H24V134Z" fill="#34A853" />

        {/* Bottom-Right Fold / Dark Green Triangle */}
        <path d="M134 134L168 134L134 168V134Z" fill="#188038" />

        {/* Top and Left Blue Frame */}
        <path d="M24 24H140V56H54V134H24V24Z" fill="#1A73E8" />

        {/* Top-Right Fold / Dark Blue Accent */}
        <path d="M134 24H168V56H134V24Z" fill="#1557B0" />

        {/* Center White Calendar Pad */}
        <rect x="54" y="56" width="80" height="78" fill="#FFFFFF" />

        {/* Date "31" */}
        <g fill="#1A73E8">
          {/* Numeral 3 */}
          <path d="M66 73h29v9.8l-15.6 13.8c3.2-.4 6.4-.2 9.4 1.2 4.6 2.1 7.7 6.6 7.7 11.7 0 7.2-5.8 13-13 13-7.5 0-12.7-5.5-13.8-12.8l9.4-2.5c.5 3.6 3.2 6.1 6.5 6.1 3.2 0 5.8-2.6 5.8-5.8 0-3.3-2.6-6-5.9-6h-6.2v-7.8l13-11.4H66V73z" />
          {/* Numeral 1 */}
          <path d="M103.5 83.2l10.8-7.8h9.2v44.1h-10.5V87.2l-9.5 6.4v-10.4z" />
        </g>
      </g>
    </svg>
  );
}
