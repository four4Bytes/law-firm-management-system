import { describe, expect, it } from "vitest";

import {
  NoteCreatePayloadSchema,
  NoteIdSchema,
  NotePageQuerySchema,
  NoteUpdatePayloadSchema,
} from "../schemas";

const uuid = "550e8400-e29b-41d4-a716-446655440000";

describe("NotePageQuerySchema", () => {
  it("accepts a valid uuid", () => {
    const result = NotePageQuerySchema.safeParse({ noteId: uuid });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid string", () => {
    const result = NotePageQuerySchema.safeParse({ noteId: "abc" });
    expect(result.success).toBe(false);
  });
});

describe("NoteCreatePayloadSchema", () => {
  it("accepts a payload with case_id", () => {
    const result = NoteCreatePayloadSchema.safeParse({
      content: "Note content",
      case_id: uuid,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a payload with consultation_id", () => {
    const result = NoteCreatePayloadSchema.safeParse({
      content: "Note content",
      consultation_id: uuid,
    });
    expect(result.success).toBe(true);
  });

  it("rejects when both parents are missing", () => {
    const result = NoteCreatePayloadSchema.safeParse({ content: "Note content" });
    expect(result.success).toBe(false);
  });

  it("rejects when both parents are provided", () => {
    const result = NoteCreatePayloadSchema.safeParse({
      content: "Note content",
      case_id: uuid,
      consultation_id: uuid,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty content", () => {
    const result = NoteCreatePayloadSchema.safeParse({ content: "", case_id: uuid });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only content", () => {
    const result = NoteCreatePayloadSchema.safeParse({ content: "   ", case_id: uuid });
    expect(result.success).toBe(false);
  });
});

describe("NoteUpdatePayloadSchema", () => {
  it("accepts a valid payload", () => {
    const result = NoteUpdatePayloadSchema.safeParse({
      noteId: uuid,
      content: "Updated content",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty content", () => {
    const result = NoteUpdatePayloadSchema.safeParse({ noteId: uuid, content: "" });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only content", () => {
    const result = NoteUpdatePayloadSchema.safeParse({
      noteId: uuid,
      content: "   ",
    });
    expect(result.success).toBe(false);
  });
});

describe("NoteIdSchema", () => {
  it("accepts a valid uuid", () => {
    const result = NoteIdSchema.safeParse({ noteId: uuid });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid string", () => {
    const result = NoteIdSchema.safeParse({ noteId: "bad" });
    expect(result.success).toBe(false);
  });
});
