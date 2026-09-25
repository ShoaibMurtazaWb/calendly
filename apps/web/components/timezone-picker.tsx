"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Globe, Search, X } from "lucide-react";

// Extensive country & alias mappings for IANA time zones
const TIMEZONE_METADATA: Record<string, { country: string; aliases: string[] }> = {
  // Asia / Middle East
  "Asia/Karachi": { country: "Pakistan", aliases: ["Pakistan", "PK", "Karachi", "Islamabad", "Lahore", "Rawalpindi"] },
  "Asia/Kolkata": { country: "India", aliases: ["India", "IN", "Bharat", "Mumbai", "Delhi", "New Delhi", "Bangalore", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Calcutta"] },
  "Asia/Dubai": { country: "United Arab Emirates", aliases: ["United Arab Emirates", "UAE", "AE", "Dubai", "Abu Dhabi", "Sharjah"] },
  "Asia/Riyadh": { country: "Saudi Arabia", aliases: ["Saudi Arabia", "KSA", "SA", "Riyadh", "Jeddah", "Mecca", "Medina", "Dammam"] },
  "Asia/Qatar": { country: "Qatar", aliases: ["Qatar", "QA", "Doha"] },
  "Asia/Kuwait": { country: "Kuwait", aliases: ["Kuwait", "KW", "Kuwait City"] },
  "Asia/Bahrain": { country: "Bahrain", aliases: ["Bahrain", "BH", "Manama"] },
  "Asia/Muscat": { country: "Oman", aliases: ["Oman", "OM", "Muscat"] },
  "Asia/Dhaka": { country: "Bangladesh", aliases: ["Bangladesh", "BD", "Dhaka", "Chittagong"] },
  "Asia/Colombo": { country: "Sri Lanka", aliases: ["Sri Lanka", "LK", "Colombo"] },
  "Asia/Kathmandu": { country: "Nepal", aliases: ["Nepal", "NP", "Kathmandu"] },
  "Asia/Singapore": { country: "Singapore", aliases: ["Singapore", "SG"] },
  "Asia/Hong_Kong": { country: "Hong Kong", aliases: ["Hong Kong", "HK"] },
  "Asia/Tokyo": { country: "Japan", aliases: ["Japan", "JP", "Tokyo", "Osaka", "Kyoto", "Yokohama"] },
  "Asia/Seoul": { country: "South Korea", aliases: ["South Korea", "Korea", "KR", "Seoul", "Busan"] },
  "Asia/Shanghai": { country: "China", aliases: ["China", "CN", "Beijing", "Shanghai", "Shenzhen", "Guangzhou"] },
  "Asia/Taipei": { country: "Taiwan", aliases: ["Taiwan", "TW", "Taipei"] },
  "Asia/Bangkok": { country: "Thailand", aliases: ["Thailand", "TH", "Bangkok", "Phuket", "Chiang Mai"] },
  "Asia/Jakarta": { country: "Indonesia", aliases: ["Indonesia", "ID", "Jakarta", "Java", "Sumatra"] },
  "Asia/Makassar": { country: "Indonesia", aliases: ["Indonesia", "ID", "Bali", "Makassar"] },
  "Asia/Kuala_Lumpur": { country: "Malaysia", aliases: ["Malaysia", "MY", "Kuala Lumpur", "Penang"] },
  "Asia/Manila": { country: "Philippines", aliases: ["Philippines", "PH", "Manila", "Cebu"] },
  "Asia/Ho_Chi_Minh": { country: "Vietnam", aliases: ["Vietnam", "VN", "Ho Chi Minh", "Saigon", "Hanoi"] },
  "Asia/Amman": { country: "Jordan", aliases: ["Jordan", "JO", "Amman"] },
  "Asia/Beirut": { country: "Lebanon", aliases: ["Lebanon", "LB", "Beirut"] },
  "Asia/Jerusalem": { country: "Israel", aliases: ["Israel", "IL", "Tel Aviv", "Jerusalem"] },
  "Asia/Baku": { country: "Azerbaijan", aliases: ["Azerbaijan", "AZ", "Baku"] },
  "Asia/Tbilisi": { country: "Georgia", aliases: ["Georgia", "GE", "Tbilisi"] },
  "Asia/Yerevan": { country: "Armenia", aliases: ["Armenia", "AM", "Yerevan"] },
  "Asia/Tashkent": { country: "Uzbekistan", aliases: ["Uzbekistan", "UZ", "Tashkent"] },
  "Asia/Almaty": { country: "Kazakhstan", aliases: ["Kazakhstan", "KZ", "Almaty", "Astana"] },

  // Europe
  "Europe/London": { country: "United Kingdom", aliases: ["United Kingdom", "UK", "GB", "Great Britain", "England", "Scotland", "Wales", "London", "Manchester", "Birmingham", "Edinburgh"] },
  "Europe/Dublin": { country: "Ireland", aliases: ["Ireland", "IE", "Dublin", "Cork"] },
  "Europe/Paris": { country: "France", aliases: ["France", "FR", "Paris", "Marseille", "Lyon", "Nice"] },
  "Europe/Berlin": { country: "Germany", aliases: ["Germany", "DE", "Deutschland", "Berlin", "Munich", "Frankfurt", "Hamburg", "Cologne"] },
  "Europe/Rome": { country: "Italy", aliases: ["Italy", "IT", "Italia", "Rome", "Milan", "Naples", "Turin"] },
  "Europe/Madrid": { country: "Spain", aliases: ["Spain", "ES", "Espana", "Madrid", "Barcelona", "Valencia", "Seville"] },
  "Europe/Amsterdam": { country: "Netherlands", aliases: ["Netherlands", "NL", "Holland", "Amsterdam", "Rotterdam", "The Hague"] },
  "Europe/Brussels": { country: "Belgium", aliases: ["Belgium", "BE", "Brussels", "Antwerp"] },
  "Europe/Zurich": { country: "Switzerland", aliases: ["Switzerland", "CH", "Zurich", "Geneva", "Basel", "Bern"] },
  "Europe/Vienna": { country: "Austria", aliases: ["Austria", "AT", "Vienna", "Salzburg"] },
  "Europe/Stockholm": { country: "Sweden", aliases: ["Sweden", "SE", "Stockholm", "Gothenburg"] },
  "Europe/Oslo": { country: "Norway", aliases: ["Norway", "NO", "Oslo", "Bergen"] },
  "Europe/Copenhagen": { country: "Denmark", aliases: ["Denmark", "DK", "Copenhagen"] },
  "Europe/Helsinki": { country: "Finland", aliases: ["Finland", "FI", "Helsinki"] },
  "Europe/Warsaw": { country: "Poland", aliases: ["Poland", "PL", "Warsaw", "Krakow"] },
  "Europe/Prague": { country: "Czech Republic", aliases: ["Czech Republic", "Czechia", "CZ", "Prague"] },
  "Europe/Budapest": { country: "Hungary", aliases: ["Hungary", "HU", "Budapest"] },
  "Europe/Bucharest": { country: "Romania", aliases: ["Romania", "RO", "Bucharest"] },
  "Europe/Athens": { country: "Greece", aliases: ["Greece", "GR", "Athens"] },
  "Europe/Istanbul": { country: "Turkey", aliases: ["Turkey", "Turkiye", "TR", "Istanbul", "Ankara", "Izmir"] },
  "Europe/Lisbon": { country: "Portugal", aliases: ["Portugal", "PT", "Lisbon", "Porto"] },
  "Europe/Kyiv": { country: "Ukraine", aliases: ["Ukraine", "UA", "Kyiv", "Kiev"] },
  "Europe/Moscow": { country: "Russia", aliases: ["Russia", "RU", "Moscow", "Saint Petersburg"] },

  // Americas
  "America/New_York": { country: "United States", aliases: ["United States", "USA", "US", "America", "New York", "NYC", "Boston", "Miami", "Atlanta", "Philadelphia", "Washington DC", "Eastern", "EST", "EDT"] },
  "America/Chicago": { country: "United States", aliases: ["United States", "USA", "US", "America", "Chicago", "Houston", "Dallas", "Austin", "San Antonio", "Minneapolis", "Central", "CST", "CDT"] },
  "America/Denver": { country: "United States", aliases: ["United States", "USA", "US", "America", "Denver", "Colorado", "Salt Lake City", "Mountain", "MST", "MDT"] },
  "America/Phoenix": { country: "United States", aliases: ["United States", "USA", "US", "America", "Phoenix", "Arizona", "AZ"] },
  "America/Los_Angeles": { country: "United States", aliases: ["United States", "USA", "US", "America", "Los Angeles", "LA", "San Francisco", "SF", "Silicon Valley", "Seattle", "San Diego", "Pacific", "PST", "PDT"] },
  "America/Anchorage": { country: "United States", aliases: ["United States", "USA", "US", "Alaska", "Anchorage"] },
  "Pacific/Honolulu": { country: "United States", aliases: ["United States", "USA", "US", "Hawaii", "Honolulu"] },
  "America/Toronto": { country: "Canada", aliases: ["Canada", "CA", "Toronto", "Ottawa", "Montreal", "Quebec", "Ontario", "Eastern"] },
  "America/Vancouver": { country: "Canada", aliases: ["Canada", "CA", "Vancouver", "British Columbia", "Victoria", "Pacific"] },
  "America/Edmonton": { country: "Canada", aliases: ["Canada", "CA", "Edmonton", "Calgary", "Alberta", "Mountain"] },
  "America/Winnipeg": { country: "Canada", aliases: ["Canada", "CA", "Winnipeg", "Manitoba", "Central"] },
  "America/Halifax": { country: "Canada", aliases: ["Canada", "CA", "Halifax", "Nova Scotia", "Atlantic"] },
  "America/Mexico_City": { country: "Mexico", aliases: ["Mexico", "MX", "Mexico City", "CDMX", "Guadalajara", "Monterrey"] },
  "America/Sao_Paulo": { country: "Brazil", aliases: ["Brazil", "Brasil", "BR", "Sao Paulo", "Rio de Janeiro", "Brasilia"] },
  "America/Buenos_Aires": { country: "Argentina", aliases: ["Argentina", "AR", "Buenos Aires"] },
  "America/Santiago": { country: "Chile", aliases: ["Chile", "CL", "Santiago"] },
  "America/Bogota": { country: "Colombia", aliases: ["Colombia", "CO", "Bogota", "Medellin"] },
  "America/Lima": { country: "Peru", aliases: ["Peru", "PE", "Lima"] },

  // Australia & Pacific
  "Australia/Sydney": { country: "Australia", aliases: ["Australia", "AU", "Sydney", "Canberra", "New South Wales", "NSW", "AEST", "AEDT"] },
  "Australia/Melbourne": { country: "Australia", aliases: ["Australia", "AU", "Melbourne", "Victoria", "VIC"] },
  "Australia/Brisbane": { country: "Australia", aliases: ["Australia", "AU", "Brisbane", "Queensland", "QLD"] },
  "Australia/Adelaide": { country: "Australia", aliases: ["Australia", "AU", "Adelaide", "South Australia", "SA"] },
  "Australia/Perth": { country: "Australia", aliases: ["Australia", "AU", "Perth", "Western Australia", "WA"] },
  "Pacific/Auckland": { country: "New Zealand", aliases: ["New Zealand", "NZ", "Auckland", "Wellington", "Christchurch"] },

  // Africa
  "Africa/Cairo": { country: "Egypt", aliases: ["Egypt", "EG", "Cairo", "Alexandria"] },
  "Africa/Johannesburg": { country: "South Africa", aliases: ["South Africa", "ZA", "Johannesburg", "Cape Town", "Durban", "Pretoria"] },
  "Africa/Lagos": { country: "Nigeria", aliases: ["Nigeria", "NG", "Lagos", "Abuja"] },
  "Africa/Nairobi": { country: "Kenya", aliases: ["Kenya", "KE", "Nairobi"] },
  "Africa/Casablanca": { country: "Morocco", aliases: ["Morocco", "MA", "Casablanca", "Rabat"] },
  "Africa/Accra": { country: "Ghana", aliases: ["Ghana", "GH", "Accra"] },

  // UTC
  UTC: { country: "Coordinated Universal Time", aliases: ["UTC", "GMT", "Universal", "Greenwich"] },
};

function getGmtOffsetString(timeZone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === "timeZoneName");
    if (offsetPart?.value) {
      return offsetPart.value;
    }
  } catch {
    // Fallback if offset lookup fails
  }
  return "GMT";
}

function formatZoneCity(timeZone: string): string {
  const parts = timeZone.split("/");
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    return lastPart ? lastPart.replace(/_/g, " ") : timeZone;
  }
  return timeZone;
}

export interface TimezonePickerProps {
  value: string;
  onChange: (tz: string) => void;
  className?: string;
  id?: string;
  variant?: "default" | "inline";
  placement?: "top" | "bottom";
}

export function TimezonePicker({
  value,
  onChange,
  className = "",
  id = "timezone-picker",
  variant = "default",
  placement,
}: TimezonePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const effectivePlacement = placement || (variant === "inline" ? "top" : "bottom");

  // Build full master list of timezones from Intl and metadata
  const allTimezones = useMemo(() => {
    let zones: string[] = [];
    try {
      zones = Intl.supportedValuesOf("timeZone");
    } catch {
      zones = Object.keys(TIMEZONE_METADATA);
    }

    // Ensure UTC is included
    if (!zones.includes("UTC")) zones.push("UTC");

    return zones.map((tz) => {
      const meta = TIMEZONE_METADATA[tz];
      const city = formatZoneCity(tz);
      const country = meta?.country || (tz.includes("/") ? tz.split("/")[0] : "");
      const offset = getGmtOffsetString(tz);
      const displayName = meta?.country ? `${meta.country}, ${city}` : city;

      const searchableText = [
        tz,
        tz.replace(/[/_]/g, " "),
        city,
        country,
        offset,
        displayName,
        ...(meta?.aliases || []),
      ]
        .join(" ")
        .toLowerCase();

      return {
        id: tz,
        city,
        country,
        offset,
        displayName,
        searchableText,
      };
    });
  }, []);

  // Format time in 12h format
  const getTimeString = (tz: string) => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date());
    } catch {
      return "";
    }
  };

  // Filter based on multi-token general search
  const filteredTimezones = useMemo(() => {
    if (!search.trim()) return allTimezones;
    const tokens = search
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    return allTimezones.filter((item) =>
      tokens.every((token) => item.searchableText.includes(token))
    );
  }, [allTimezones, search]);

  // Selected item details
  const selectedInfo = useMemo(() => {
    const found = allTimezones.find((z) => z.id === value);
    if (found) {
      return {
        ...found,
        formattedTime: getTimeString(found.id),
      };
    }
    return {
      id: value,
      city: formatZoneCity(value),
      country: value.split("/")[0] || "",
      offset: getGmtOffsetString(value),
      displayName: formatZoneCity(value),
      formattedTime: getTimeString(value),
    };
  }, [allTimezones, value]);

  // Close on click outside or Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Autofocus search on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  return (
    <div className={`relative ${variant === "inline" ? "inline-block w-full" : "w-full"} ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      {variant === "inline" ? (
        <button
          type="button"
          id={id}
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer focus:outline-none group text-left"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <Globe className="h-3.5 w-3.5 text-neutral-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0" />
          <span className="truncate max-w-[280px]">
            {selectedInfo.displayName || selectedInfo.city} ({selectedInfo.formattedTime || selectedInfo.offset})
          </span>
          <ChevronDown
            className={`h-3 w-3 text-neutral-500 transition-transform duration-150 shrink-0 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      ) : (
        <button
          type="button"
          id={id}
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full flex items-center justify-between gap-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:bg-neutral-800/60 px-3.5 py-2.5 text-xs text-left transition-colors shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-600"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="h-4 w-4 shrink-0 text-neutral-500" />
            <div className="min-w-0 truncate">
              <span className="font-semibold text-neutral-900 dark:text-white">
                {selectedInfo.city}
              </span>
              <span className="ml-1.5 text-[11px] font-mono text-neutral-500">
                ({selectedInfo.offset})
              </span>
              {selectedInfo.country && selectedInfo.country !== selectedInfo.city && (
                <span className="ml-1 text-[11px] text-neutral-500 truncate">
                  • {selectedInfo.country}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {selectedInfo.formattedTime && (
              <span className="text-[11px] font-mono text-neutral-500 hidden sm:inline">
                {selectedInfo.formattedTime}
              </span>
            )}
            <ChevronDown
              className={`h-3.5 w-3.5 text-neutral-400 transition-transform duration-150 ${
                isOpen ? "rotate-180 text-neutral-700" : ""
              }`}
            />
          </div>
        </button>
      )}

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          className={`absolute left-0 z-50 w-[300px] sm:w-[350px] rounded-2xl border border-neutral-200 bg-white dark:bg-neutral-950 dark:border-neutral-800 shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 ${
            effectivePlacement === "top"
              ? "bottom-full mb-2.5"
              : "top-full mt-2"
          }`}
        >
          {/* Search Bar Input */}
          <div className="p-3 border-b border-neutral-100 dark:border-neutral-800">
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full h-9 pl-9 pr-8 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 text-neutral-400 hover:text-black dark:hover:text-white p-0.5 rounded cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Subheader: TIME ZONE label */}
          <div className="px-3.5 py-2 bg-neutral-50/80 dark:bg-neutral-900/60 border-b border-neutral-100 dark:border-neutral-800 text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
            <span>Time Zone</span>
          </div>

          {/* Timezones List (~6 items visible with smooth scrolling) */}
          <div
            className="max-h-[250px] overflow-y-auto p-1.5 space-y-0.5 divide-y divide-neutral-50 dark:divide-neutral-900/50"
            role="listbox"
          >
            {filteredTimezones.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                <p className="font-semibold text-neutral-700 dark:text-neutral-300">
                  No timezones found
                </p>
                <p className="mt-0.5 text-[11px]">
                  Try searching by country, city, or UTC offset
                </p>
              </div>
            ) : (
              filteredTimezones.map((tz) => {
                const isSelected = tz.id === value;
                const currentTime = getTimeString(tz.id);
                return (
                  <button
                    key={tz.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(tz.id);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs text-left transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 text-white font-medium shadow-2xs"
                        : "text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100/80 dark:hover:bg-neutral-900"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="truncate font-medium">
                        {tz.displayName || tz.city}
                      </div>
                      <div
                        className={`text-[10px] font-mono mt-0.5 ${
                          isSelected ? "text-blue-100" : "text-neutral-400"
                        }`}
                      >
                        {tz.id}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                      <span className={isSelected ? "text-blue-100 font-semibold" : "text-neutral-500"}>
                        {currentTime}
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
