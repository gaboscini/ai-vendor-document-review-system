export const DEFAULT_PREFERENCES = Object.freeze({
  theme: "light",
  accent: "blue",
  density: "comfortable",
});

const themes = new Set(["light", "dark", "system"]);
const accents = new Set(["blue", "violet", "teal"]);
const densities = new Set(["comfortable", "compact"]);

export function normalizePreferences(value) {
  if (!value || typeof value !== "object") return { ...DEFAULT_PREFERENCES };
  return {
    theme: themes.has(value.theme) ? value.theme : DEFAULT_PREFERENCES.theme,
    accent: accents.has(value.accent) ? value.accent : DEFAULT_PREFERENCES.accent,
    density: densities.has(value.density) ? value.density : DEFAULT_PREFERENCES.density,
  };
}

export function resolveTheme(theme, prefersDark) {
  return theme === "system" ? (prefersDark ? "dark" : "light") : theme;
}

export function serializePreferences(value) {
  return JSON.stringify(normalizePreferences(value));
}
