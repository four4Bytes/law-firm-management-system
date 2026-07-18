import { CalendarDate } from "@internationalized/date";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  coerceEnum,
  createFieldValidator,
  emailText,
  keysToSet,
  optionalString,
  optionalText,
  positiveNumber,
  requiredEnum,
  requiredString,
  requiredText,
  selectEnumHandler,
  toDateValue,
} from "@/lib/form-utils";

const SampleStatus = { Active: "active", Inactive: "inactive" } as const;

describe("optionalString", () => {
  it("trims and returns undefined for empty/whitespace values", () => {
    expect(optionalString("")).toBeUndefined();
    expect(optionalString("   ")).toBeUndefined();
    expect(optionalString("ok")).toBe("ok");
    expect(optionalString("  ok  ")).toBe("ok");
  });
});

describe("requiredString", () => {
  it("trims without dropping defined values", () => {
    expect(requiredString("  name  ")).toBe("name");
    expect(requiredString("x")).toBe("x");
  });
});

describe("coerceEnum", () => {
  it("maps a select key to its enum value", () => {
    expect(coerceEnum("Active", SampleStatus)).toBe("active");
    expect(coerceEnum("Inactive", SampleStatus)).toBe("inactive");
  });
});

describe("selectEnumHandler", () => {
  it("invokes the callback with the coerced enum value", () => {
    const onChange = vi.fn();
    selectEnumHandler(SampleStatus, onChange)("Active");
    expect(onChange).toHaveBeenCalledWith("active");
  });

  it("ignores null selection", () => {
    const onChange = vi.fn();
    selectEnumHandler(SampleStatus, onChange)(null);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("keysToSet", () => {
  it("converts iterable keys into a string set", () => {
    expect(keysToSet(["a", "b"])).toEqual(new Set(["a", "b"]));
    expect(keysToSet(new Set(["x"]))).toEqual(new Set(["x"]));
  });
});

describe("toDateValue", () => {
  it("converts a CalendarDate to a Date in the local timezone", () => {
    const date = new CalendarDate(2024, 6, 15);
    expect(toDateValue(date)).toBeInstanceOf(Date);
    expect(toDateValue(date).getFullYear()).toBe(2024);
  });
});

describe("createFieldValidator", () => {
  const schema = z.object({
    title: z.string().trim().min(1).max(10),
    note: z.string().trim().min(1).max(5).optional(),
  });

  it("returns null for valid values", () => {
    const validate = createFieldValidator(schema.shape.title);
    expect(validate("hello")).toBeNull();
  });

  it("returns an error message for invalid values", () => {
    const validate = createFieldValidator(schema.shape.title);
    expect(typeof validate("")).toBe("string");
    expect(typeof validate("way too long value")).toBe("string");
  });

  it("treats empty input as undefined so optional fields pass", () => {
    const validate = createFieldValidator(schema.shape.note);
    expect(validate("")).toBeNull();
    expect(validate("  ")).toBeNull();
  });

  it("flags non-empty optional values that exceed the limit", () => {
    const validate = createFieldValidator(schema.shape.note);
    expect(typeof validate("too long")).toBe("string");
  });
});

describe("Zod message builders", () => {
  describe("requiredText", () => {
    const schema = requiredText(5, "Title");

    it("accepts a valid value", () => {
      expect(schema.safeParse("abc").success).toBe(true);
    });

    it("reports a required message for empty/undefined input", () => {
      expect(schema.safeParse(undefined).error?.issues[0]?.message).toBe("Title is required");
      expect(schema.safeParse("").error?.issues[0]?.message).toBe("Title is required");
    });

    it("reports an over-length message", () => {
      expect(schema.safeParse("toolong").error?.issues[0]?.message).toBe(
        "Title must be at most 5 characters",
      );
    });
  });

  describe("optionalText", () => {
    const schema = optionalText(5, "Note");

    it("allows empty input", () => {
      expect(schema.safeParse("").success).toBe(true);
      expect(schema.safeParse(undefined).success).toBe(true);
    });

    it("reports an over-length message for non-empty values", () => {
      expect(schema.safeParse("toolong").error?.issues[0]?.message).toBe(
        "Note must be at most 5 characters",
      );
    });

    it("defaults to an empty string when withDefault is set", () => {
      expect(optionalText(5, "Note", true).parse(undefined)).toBe("");
    });
  });

  describe("positiveNumber", () => {
    const schema = positiveNumber(10, "Amount");

    it("accepts a valid positive number", () => {
      expect(schema.safeParse("5").success).toBe(true);
    });

    it("reports a non-numeric message", () => {
      expect(schema.safeParse(undefined).error?.issues[0]?.message).toBe("Enter a valid amount");
    });

    it("reports a non-positive message", () => {
      expect(schema.safeParse("-3").error?.issues[0]?.message).toBe(
        "Amount must be greater than 0",
      );
    });

    it("reports an over-maximum message", () => {
      expect(schema.safeParse("50").error?.issues[0]?.message).toBe("Amount must not exceed 10");
    });
  });

  describe("requiredEnum", () => {
    const schema = requiredEnum({ Active: "Active", Inactive: "Inactive" } as const, "Status");

    it("reports a selection message for missing values", () => {
      expect(schema.safeParse(undefined).error?.issues[0]?.message).toBe("Select a status");
    });
  });

  describe("emailText", () => {
    const schema = emailText("Email");

    it("accepts a valid email", () => {
      expect(schema.safeParse("a@b.com").success).toBe(true);
    });

    it("reports an invalid-format message", () => {
      expect(schema.safeParse("not-an-email").error?.issues[0]?.message).toBe(
        "Enter a valid email",
      );
    });
  });

  describe("createFieldValidator with builders", () => {
    it("surfaces the friendly required message", () => {
      const validate = createFieldValidator(requiredText(5, "Title"));
      expect(validate("")).toBe("Title is required");
    });
  });
});
