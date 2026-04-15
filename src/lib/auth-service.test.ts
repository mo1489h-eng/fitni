import { describe, it, expect } from "vitest";
import { normalizeFitniRole } from "./auth-role";

describe("normalizeFitniRole", () => {
  it("maps coach synonyms", () => {
    expect(normalizeFitniRole("coach")).toBe("coach");
    expect(normalizeFitniRole("TRAINER")).toBe("coach");
  });
  it("maps trainee synonyms", () => {
    expect(normalizeFitniRole("trainee")).toBe("trainee");
    expect(normalizeFitniRole("client")).toBe("trainee");
  });
  it("returns null for empty or unknown", () => {
    expect(normalizeFitniRole(null)).toBe(null);
    expect(normalizeFitniRole("")).toBe(null);
    expect(normalizeFitniRole("admin")).toBe(null);
  });
});
