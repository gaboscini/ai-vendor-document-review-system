export type ThemePreference = "light" | "dark" | "system";
export type AccentPreference = "blue" | "violet" | "teal";
export type DensityPreference = "comfortable" | "compact";
export type Preferences = { theme: ThemePreference; accent: AccentPreference; density: DensityPreference };
export const DEFAULT_PREFERENCES: Readonly<Preferences>;
export function normalizePreferences(value: unknown): Preferences;
export function resolveTheme(theme: ThemePreference, prefersDark: boolean): "light" | "dark";
export function serializePreferences(value: unknown): string;
