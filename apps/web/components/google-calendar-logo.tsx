import React from "react";

interface GoogleCalendarLogoProps {
  className?: string;
  size?: number;
}

/**
 * Official Google Calendar brand icon with 4-color styling and date sheet motif.
 */
export function GoogleCalendarLogo({ className = "h-8 w-8", size }: GoogleCalendarLogoProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background container / Blue top & sides */}
      <path
        d="M38 44H10C7.79086 44 6 42.2091 6 40V10C6 7.79086 7.79086 6 10 6H38C40.2091 6 42 7.79086 42 10V40C42 42.2091 40.2091 44 38 44Z"
        fill="#FFFFFF"
      />
      {/* Top Header Blue */}
      <path
        d="M38 6H10C7.79086 6 6 7.79086 6 10V16H42V10C42 7.79086 40.2091 6 38 6Z"
        fill="#4285F4"
      />
      {/* Red corner accent */}
      <path
        d="M42 10C42 7.79086 40.2091 6 38 6H33V16H42V10Z"
        fill="#EA4335"
      />
      {/* Yellow left accent */}
      <path
        d="M6 16H15V6H10C7.79086 6 6 7.79086 6 10V16Z"
        fill="#FBBC05"
      />
      {/* Green bottom right corner */}
      <path
        d="M42 33H33V44H38C40.2091 44 42 42.2091 42 40V33Z"
        fill="#34A853"
      />
      {/* Outer border for depth */}
      <rect
        x="6"
        y="6"
        width="36"
        height="38"
        rx="4"
        stroke="#E0E0E0"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Calendar date representation: numeral "31" or date grid */}
      <path
        d="M17 25C17 23.3431 18.3431 22 20 22C21.6569 22 23 23.3431 23 25C23 26.6569 21.6569 28 20 28M20 28C21.6569 28 23 29.3431 23 31C23 32.6569 21.6569 34 20 34C18.3431 34 17 32.6569 17 31M20 28H18"
        stroke="#4285F4"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M28 23V34M28 23L25.5 25"
        stroke="#4285F4"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
