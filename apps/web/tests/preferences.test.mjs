import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_PREFERENCES, normalizePreferences, resolveTheme, serializePreferences } from "../lib/preferences.mjs";

test("invalid stored preferences fall back safely", () => {
  assert.deepEqual(normalizePreferences(null), DEFAULT_PREFERENCES);
  assert.deepEqual(normalizePreferences({ theme: "neon", accent: "orange", density: "tiny" }), DEFAULT_PREFERENCES);
});

test("valid preferences are preserved", () => {
  assert.deepEqual(normalizePreferences({ theme: "dark", accent: "violet", density: "compact" }), {
    theme: "dark", accent: "violet", density: "compact",
  });
});

test("system theme follows operating-system preference", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("light", true), "light");
});

test("preferences serialize in normalized form", () => {
  assert.equal(serializePreferences({ theme: "dark", accent: "teal", density: "compact" }), '{"theme":"dark","accent":"teal","density":"compact"}');
});
