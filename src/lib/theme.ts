export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

/*
 * The theme the user picked, if any.
 * Without one, the system setting
 * is used.
 */
function getStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);

    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function getCurrentTheme(): Theme {
  return (
    getStoredTheme() ??
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light")
  );
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;

  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage blocked: the theme still applies for this visit.
  }
}
