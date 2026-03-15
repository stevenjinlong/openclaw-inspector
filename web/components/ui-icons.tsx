import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function SvgIcon({
  children,
  className,
  viewBox = "0 0 24 24",
  ...props
}: IconProps & { children: ReactNode; viewBox?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="3.5" width="7" height="11" rx="1.8" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="17.5" width="7" height="3" rx="1.5" />
    </SvgIcon>
  );
}

export function SessionsIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M6 7.5h12" />
      <path d="M6 12h12" />
      <path d="M6 16.5h8" />
      <rect x="3.5" y="4" width="17" height="16" rx="3" />
    </SvgIcon>
  );
}

export function MaintenanceIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M14.5 5.5a4 4 0 0 0 4 4l-6.4 6.4a2.2 2.2 0 0 1-3.1 0l-.9-.9a2.2 2.2 0 0 1 0-3.1l6.4-6.4a4 4 0 0 0 4 4" />
      <path d="M18.5 5.5 20 4" />
      <path d="m4 20 3.5-3.5" />
    </SvgIcon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4 7h6" />
      <path d="M14 7h6" />
      <path d="M4 17h10" />
      <path d="M18 17h2" />
      <circle cx="12" cy="7" r="2" />
      <circle cx="16" cy="17" r="2" />
    </SvgIcon>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </SvgIcon>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </SvgIcon>
  );
}

export function ActivityIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M3 12h4l2.5-5 5 10 2.5-5H21" />
    </SvgIcon>
  );
}

export function ChartBarIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20v-11" />
      <path d="M3 20h19" />
    </SvgIcon>
  );
}

export function DatabaseIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
      <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </SvgIcon>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12 3 5.5 5.8v5.5c0 4.1 2.5 7.8 6.5 9.7 4-1.9 6.5-5.6 6.5-9.7V5.8L12 3Z" />
      <path d="m9.5 12 1.7 1.7 3.3-3.6" />
    </SvgIcon>
  );
}

export function SparklesIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m12 3 1.4 3.6L17 8l-3.6 1.4L12 13l-1.4-3.6L7 8l3.6-1.4L12 3Z" />
      <path d="m5 15 .8 2 .2.8.8.2 2 .8-2 .8-.8.2-.2.8-.8 2-.8-2-.2-.8-.8-.2-2-.8 2-.8.8-.2.2-.8.8-2Z" />
      <path d="m19 13 .5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5.5-1.4Z" />
    </SvgIcon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.2-4.2" />
    </SvgIcon>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5l3 1.8" />
    </SvgIcon>
  );
}

export function PauseCircleIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10 9v6" />
      <path d="M14 9v6" />
    </SvgIcon>
  );
}

export function AlertTriangleIcon(props: IconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12 4.5 20 18.5H4L12 4.5Z" />
      <path d="M12 9v4.5" />
      <circle cx="12" cy="16.2" r="0.7" fill="currentColor" stroke="none" />
    </SvgIcon>
  );
}
