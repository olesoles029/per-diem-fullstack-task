import { describe, it, expect, beforeEach } from "vitest";
import { get, set, invalidate } from "./cache.js";

describe("cache", () => {
  beforeEach(() => {
    invalidate();
  });

  it("returns null for missing key", () => {
    expect(get("missing")).toBeNull();
  });

  it("returns value after set", () => {
    set("k", { x: 1 });
    expect(get("k")).toEqual({ x: 1 });
  });

  it("overwrites existing key", () => {
    set("k", 1);
    set("k", 2);
    expect(get("k")).toBe(2);
  });

  it("invalidate() clears all", () => {
    set("a", 1);
    set("b", 2);
    invalidate();
    expect(get("a")).toBeNull();
    expect(get("b")).toBeNull();
  });

  it("invalidate(prefix) clears matching keys", () => {
    set("catalog:loc1", 1);
    set("catalog:loc2", 2);
    set("other", 3);
    invalidate("catalog:*");
    expect(get("catalog:loc1")).toBeNull();
    expect(get("catalog:loc2")).toBeNull();
    expect(get("other")).toBe(3);
  });
});
