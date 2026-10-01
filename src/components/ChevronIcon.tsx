/*
 * Down-pointing chevron. Inherits the
 * text color; rotate it with CSS to
 * show the open state.
 */
export default function ChevronIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
