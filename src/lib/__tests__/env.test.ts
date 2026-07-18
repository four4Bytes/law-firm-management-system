import { afterEach, describe, expect, it } from "vitest";

import {
  getEnvBoolean,
  getOptionalEnvVar,
  getOptionalFloat,
  getOptionalInteger,
  getRequiredEnvVar,
  getRequiredFloat,
  getRequiredInteger,
} from "@/lib/env";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("getRequiredEnvVar", () => {
  it("returns the value when set", () => {
    process.env.TEST_VAR = "hello";
    expect(getRequiredEnvVar("TEST_VAR")).toBe("hello");
  });

  it("trims whitespace", () => {
    process.env.TEST_VAR = "  spaced  ";
    expect(getRequiredEnvVar("TEST_VAR")).toBe("spaced");
  });

  it("throws on undefined", () => {
    expect(() => getRequiredEnvVar("MISSING_VAR")).toThrow(
      "Missing required environment variable: MISSING_VAR",
    );
  });

  it("throws on empty string", () => {
    process.env.TEST_VAR = "";
    expect(() => getRequiredEnvVar("TEST_VAR")).toThrow(
      "Missing required environment variable: TEST_VAR",
    );
  });

  it("throws on whitespace-only", () => {
    process.env.TEST_VAR = "   ";
    expect(() => getRequiredEnvVar("TEST_VAR")).toThrow(
      "Missing required environment variable: TEST_VAR",
    );
  });
});

describe("getOptionalEnvVar", () => {
  it("returns the value when set", () => {
    process.env.TEST_VAR = "world";
    expect(getOptionalEnvVar("TEST_VAR", "fallback")).toBe("world");
  });

  it("returns fallback when unset", () => {
    expect(getOptionalEnvVar("MISSING_VAR", "fallback")).toBe("fallback");
  });

  it("returns fallback on empty string", () => {
    process.env.TEST_VAR = "";
    expect(getOptionalEnvVar("TEST_VAR", "fallback")).toBe("fallback");
  });

  it("returns fallback on whitespace-only", () => {
    process.env.TEST_VAR = "   ";
    expect(getOptionalEnvVar("TEST_VAR", "fallback")).toBe("fallback");
  });

  it("trims the value", () => {
    process.env.TEST_VAR = "  val  ";
    expect(getOptionalEnvVar("TEST_VAR", "fallback")).toBe("val");
  });
});

describe("getEnvBoolean", () => {
  it("returns true for 'true'", () => {
    process.env.TEST_VAR = "true";
    expect(getEnvBoolean("TEST_VAR")).toBe(true);
  });

  it("returns true for 'TRUE' (case-insensitive)", () => {
    process.env.TEST_VAR = "TRUE";
    expect(getEnvBoolean("TEST_VAR")).toBe(true);
  });

  it("returns true for '1'", () => {
    process.env.TEST_VAR = "1";
    expect(getEnvBoolean("TEST_VAR")).toBe(true);
  });

  it("returns true for 'yes'", () => {
    process.env.TEST_VAR = "yes";
    expect(getEnvBoolean("TEST_VAR")).toBe(true);
  });

  it("returns true for 'on'", () => {
    process.env.TEST_VAR = "on";
    expect(getEnvBoolean("TEST_VAR")).toBe(true);
  });

  it("returns false for 'false'", () => {
    process.env.TEST_VAR = "false";
    expect(getEnvBoolean("TEST_VAR")).toBe(false);
  });

  it("returns false for '0'", () => {
    process.env.TEST_VAR = "0";
    expect(getEnvBoolean("TEST_VAR")).toBe(false);
  });

  it("returns false for 'no'", () => {
    process.env.TEST_VAR = "no";
    expect(getEnvBoolean("TEST_VAR")).toBe(false);
  });

  it("returns false for 'off'", () => {
    process.env.TEST_VAR = "off";
    expect(getEnvBoolean("TEST_VAR")).toBe(false);
  });

  it("returns false for random string", () => {
    process.env.TEST_VAR = "banana";
    expect(getEnvBoolean("TEST_VAR")).toBe(false);
  });

  it("returns false when unset", () => {
    expect(getEnvBoolean("MISSING_VAR")).toBe(false);
  });

  it("trims before checking", () => {
    process.env.TEST_VAR = "  true  ";
    expect(getEnvBoolean("TEST_VAR")).toBe(true);
  });
});

describe("getRequiredInteger", () => {
  it("returns the parsed integer", () => {
    process.env.TEST_VAR = "42";
    expect(getRequiredInteger("TEST_VAR")).toBe(42);
  });

  it("throws on missing var", () => {
    expect(() => getRequiredInteger("MISSING_VAR")).toThrow(
      "Missing required environment variable: MISSING_VAR",
    );
  });

  it("throws on float string", () => {
    process.env.TEST_VAR = "3.14";
    expect(() => getRequiredInteger("TEST_VAR")).toThrow(
      "Environment variable TEST_VAR must be an integer, got: 3.14",
    );
  });

  it("throws on non-numeric string", () => {
    process.env.TEST_VAR = "abc";
    expect(() => getRequiredInteger("TEST_VAR")).toThrow(
      "Environment variable TEST_VAR must be an integer, got: abc",
    );
  });
});

describe("getOptionalInteger", () => {
  it("returns the parsed integer when set", () => {
    process.env.TEST_VAR = "25";
    expect(getOptionalInteger("TEST_VAR", 0)).toBe(25);
  });

  it("returns fallback when unset", () => {
    expect(getOptionalInteger("MISSING_VAR", 10)).toBe(10);
  });

  it("returns fallback on empty string", () => {
    process.env.TEST_VAR = "";
    expect(getOptionalInteger("TEST_VAR", 10)).toBe(10);
  });

  it("throws on non-integer value", () => {
    process.env.TEST_VAR = "abc";
    expect(() => getOptionalInteger("TEST_VAR", 0)).toThrow(
      "Environment variable TEST_VAR must be an integer, got: abc",
    );
  });

  it("throws on float value", () => {
    process.env.TEST_VAR = "1.5";
    expect(() => getOptionalInteger("TEST_VAR", 0)).toThrow(
      "Environment variable TEST_VAR must be an integer, got: 1.5",
    );
  });
});

describe("getRequiredFloat", () => {
  it("returns the parsed float", () => {
    process.env.TEST_VAR = "3.14";
    expect(getRequiredFloat("TEST_VAR")).toBeCloseTo(3.14);
  });

  it("returns the parsed integer as float", () => {
    process.env.TEST_VAR = "42";
    expect(getRequiredFloat("TEST_VAR")).toBe(42);
  });

  it("throws on missing var", () => {
    expect(() => getRequiredFloat("MISSING_VAR")).toThrow(
      "Missing required environment variable: MISSING_VAR",
    );
  });

  it("throws on non-numeric string", () => {
    process.env.TEST_VAR = "abc";
    expect(() => getRequiredFloat("TEST_VAR")).toThrow(
      "Environment variable TEST_VAR must be a number, got: abc",
    );
  });
});

describe("getOptionalFloat", () => {
  it("returns the parsed float when set", () => {
    process.env.TEST_VAR = "2.71";
    expect(getOptionalFloat("TEST_VAR", 0)).toBeCloseTo(2.71);
  });

  it("returns fallback when unset", () => {
    expect(getOptionalFloat("MISSING_VAR", 1.5)).toBe(1.5);
  });

  it("returns fallback on empty string", () => {
    process.env.TEST_VAR = "";
    expect(getOptionalFloat("TEST_VAR", 1.5)).toBe(1.5);
  });

  it("throws on non-numeric value", () => {
    process.env.TEST_VAR = "abc";
    expect(() => getOptionalFloat("TEST_VAR", 0)).toThrow(
      "Environment variable TEST_VAR must be a number, got: abc",
    );
  });
});
