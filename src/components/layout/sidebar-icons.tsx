import type { NavigationIcon } from "@/types/erp";

export function SidebarIcon({ name, className = "" }: { name?: NavigationIcon; className?: string }) {
  const common = {
    "aria-hidden": true,
    className: `h-4.5 w-4.5 shrink-0 ${className}`,
    fill: "none",
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "students":
    case "parents":
    case "users":
      return (
        <svg {...common}>
          <path d="M16 19v-1.5A3.5 3.5 0 0 0 12.5 14h-5A3.5 3.5 0 0 0 4 17.5V19m12.5-5.5A3 3 0 0 0 15 8m5 11v-1a4 4 0 0 0-3-3.87M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      );
    case "admissions":
      return (
        <svg {...common}>
          <path d="M12 5v8m4-4H8m-3 8.5V5.8A1.8 1.8 0 0 1 6.8 4h10.4A1.8 1.8 0 0 1 19 5.8v11.7L16.5 20h-9L5 17.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      );
    case "academics":
      return (
        <svg {...common}>
          <path d="m3 8 9-4 9 4-9 4-9-4Zm4 3v4.5c1.5 1.1 3.1 1.6 5 1.6s3.5-.5 5-1.6V11" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      );
    case "attendance":
      return (
        <svg {...common}>
          <path d="M8 3v3m8-3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm4 9 1.5 1.5L15 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      );
    case "timetable":
      return (
        <svg {...common}>
          <path d="M4 6h16M4 10h16M8 3v18M16 3v18M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      );
    case "homework":
      return (
        <svg {...common}>
          <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5v-17Zm4 5 2 2 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      );
    case "assessments":
      return (
        <svg {...common}>
          <path d="M9 5h6m-7 7 2 2 5-5M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      );
    case "finance":
      return (
        <svg {...common}>
          <path d="M7 5h10M8 9h8m-7 0a5 5 0 0 1 0 10h6M9 13h7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      );
    case "payroll":
      return (
        <svg {...common}>
          <path d="M4 7h16v11H4V7Zm3-3h10v3H7V4Zm2 8h.01M13 12h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      );
    case "communication":
      return (
        <svg {...common}>
          <path d="M4 11v2a2 2 0 0 0 2 2h2l4 4v-4h2l6 3V6l-6 3H6a2 2 0 0 0-2 2Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      );
    case "reports":
      return (
        <svg {...common}>
          <path d="M5 19V5m0 14h14M9 15v-4m4 4V7m4 8v-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7-3.5a7.4 7.4 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a7 7 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.5a7.4 7.4 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.3 3.1h5l.3-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.07-.33.1-.66.1-1Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
        </svg>
      );
    case "audit":
      return (
        <svg {...common}>
          <path d="M4 12a8 8 0 1 0 2.34-5.66M4 4v5h5m3-1v5l3 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      );
    case "help":
      return (
        <svg {...common}>
          <path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.83c-.9.72-1.7 1.18-1.7 2.67M12 17h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      );
    case "dashboard":
    default:
      return (
        <svg {...common}>
          <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h5v7h-7V5.5Zm9.5-1.5h5A1.5 1.5 0 0 1 20 5.5v3h-6.5V4ZM4 13.5h7V20H5.5A1.5 1.5 0 0 1 4 18.5v-5Zm9.5-2.5H20v7.5a1.5 1.5 0 0 1-1.5 1.5h-5v-9Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      );
  }
}

export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24">
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export function MenuIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export function PanelToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d={collapsed ? "M4 5h16v14H4V5Zm6 0v14m3-6 3-3m-3 3 3 3" : "M4 5h16v14H4V5Zm6 0v14m5-10-3 3 3 3"}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
