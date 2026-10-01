import "./Loader.css";

interface LoaderProps {
  /*
   * "page" fills the screen,
   * "section" fits inside a card.
   */
  variant?: "page" | "section";
  message?: string;
}

export default function Loader({
  variant = "section",
  message = "Loading...",
}: LoaderProps) {
  return (
    <div className={`loader loader-${variant}`} role="status" aria-live="polite">
      <div className="loader-mark" aria-hidden="true">
        <span className="loader-ring" />
        <span className="loader-ring loader-ring-delayed" />

        <span className="loader-orbit">
          <span className="loader-dot" />
        </span>

        <span className="loader-icon">🧾</span>
      </div>

      {variant === "page" && <strong className="loader-title">Bill Tracker</strong>}

      <p className="loader-message">{message}</p>

      <div className="loader-progress" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}
