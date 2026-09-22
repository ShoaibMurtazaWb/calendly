import React from "react";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

export function Logo({ className = "h-8 w-8", size, ...props }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={className}
      {...props}
    >
      {/* Outer container with subtle border */}
      <rect width="64" height="64" rx="16" fill="#0F172A" />
      <rect x="1" y="1" width="62" height="62" rx="15" stroke="#334155" strokeOpacity="0.6" strokeWidth="1.5" />

      {/* Calendar pins / temporal anchors at top */}
      <rect x="22" y="10" width="4" height="8" rx="2" fill="#94A3B8" />
      <rect x="38" y="10" width="4" height="8" rx="2" fill="#94A3B8" />

      {/* Interlocking geometric 'S' scheduling path */}
      <path
        d="M44 23H24C20.6863 23 18 25.6863 18 29C18 32.3137 20.6863 35 24 35H40C43.3137 35 46 37.6863 46 41C46 44.3137 43.3137 47 40 47H20"
        stroke="#FFFFFF"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Precision sync nodes / status dots */}
      <circle cx="44" cy="23" r="3.5" fill="#6366F1" />
      <circle cx="44" cy="23" r="1.5" fill="#FFFFFF" />
      <circle cx="20" cy="47" r="3.5" fill="#10B981" />
      <circle cx="20" cy="47" r="1.5" fill="#FFFFFF" />

      {/* Central alignment micro-tick */}
      <circle cx="32" cy="35" r="2" fill="#38BDF8" />
    </svg>
  );
}
