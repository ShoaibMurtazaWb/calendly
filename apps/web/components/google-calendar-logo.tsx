import React from "react";

interface GoogleCalendarLogoProps {
  className?: string;
  size?: number;
}

/**
 * Official Google Workspace Calendar vector mark following Google Brand Guidelines.
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
      {/* Base White Canvas */}
      <rect x="32" y="32" width="128" height="128" rx="20" fill="#FFFFFF" />

      {/* Top-Right Red Corner & Top Banner */}
      <path
        d="M140 32H120V68H160V52C160 40.9543 151.046 32 140 32Z"
        fill="#EA4335"
      />

      {/* Top-Left Yellow Corner */}
      <path
        d="M52 32C40.9543 32 32 40.9543 32 52V68H72V32H52Z"
        fill="#FBBC04"
      />

      {/* Bottom-Right Green Corner */}
      <path
        d="M140 160C151.046 160 160 151.046 160 140V124H120V160H140Z"
        fill="#34A853"
      />

      {/* Bottom-Left & Outer Border Blue Accent */}
      <path
        d="M32 140C32 151.046 40.9543 160 52 160H120V124H32V140Z"
        fill="#4285F4"
      />
      <path
        d="M72 32H120V68H72V32Z"
        fill="#1A73E8"
      />
      <path
        d="M32 68H72V124H32V68Z"
        fill="#1A73E8"
      />
      <path
        d="M120 68H160V124H120V68Z"
        fill="#1A73E8"
      />

      {/* Inner White Calendar Pad */}
      <rect x="46" y="46" width="100" height="100" rx="10" fill="#FFFFFF" />

      {/* Date "31" Vector Path in Google Blue */}
      <g fill="#1A73E8">
        {/* Numeral "3" */}
        <path
          d="M66 73H86V83.5H76V89.5H86V100H66V109H91C94.866 109 98 105.866 98 102V93C98 89.9 96.1 87.2 93.3 86.3C95.5 85.2 97 82.8 97 80V73C97 69.134 93.866 66 90 66H66V73Z"
        />
        {/* Numeral "1" */}
        <path
          d="M109 76.5L118.5 67.5H127V109H116V78.5L109 84.5V76.5Z"
        />
      </g>
    </svg>
  );
}
