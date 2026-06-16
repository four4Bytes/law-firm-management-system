import { describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { getUserByEmail, getUsers, getUsersPaginated } from "../queries";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn(), findMany: vi.fn() } },
}));

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  is_active: true,
  created_at: true,
} as const;

const mockUser = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "1",
  name: "Test User",
  email: "a@b.com",
  google_sub: null,
  role: "Dev" as const,
  is_active: true,
  created_at: new Date("2024-01-01"),
  updated_at: new Date("2024-01-01"),
  emailVerified: null,
  image: null,
  ...overrides,
});

describe("getUserByEmail", () => {
  it("returns user when found", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser());

    const result = await getUserByEmail("a@b.com");

    expect(result).toMatchObject({
      id: "1",
      role: "Dev",
      is_active: true,
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "a@b.com" },
      select: { id: true, role: true, is_active: true },
    });
  });

  it("returns null when not found", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const result = await getUserByEmail("missing@b.com");

    expect(result).toBeNull();
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.user.findUnique).mockRejectedValue(error);

    await expect(getUserByEmail("a@b.com")).rejects.toThrow(error);
  });
});

describe("getUsers", () => {
  it("returns all users ordered by created_at desc", async () => {
    const users = [
      mockUser({ id: "1", name: "Alice", email: "alice@b.com" }),
      mockUser({ id: "2", name: "Bob", email: "bob@b.com" }),
    ];
    vi.mocked(prisma.user.findMany).mockResolvedValue(users);

    const result = await getUsers();

    expect(result).toHaveLength(2);
    expect(result).toMatchObject([
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
    ]);
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      orderBy: { created_at: "desc" },
      select: userSelect,
    });
  });

  it("returns empty array when none exist", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);

    const result = await getUsers();

    expect(result).toEqual([]);
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.user.findMany).mockRejectedValue(error);

    await expect(getUsers()).rejects.toThrow(error);
  });
});

describe("getUsersPaginated", () => {
  it("returns first page of users", async () => {
    const users = Array.from({ length: 3 }, (_, i) =>
      mockUser({ id: String(i + 1), name: `User ${i + 1}` }),
    );
    vi.mocked(prisma.user.findMany).mockResolvedValue(users);

    const result = await getUsersPaginated({ pageSize: 3 });

    expect(result.users).toHaveLength(3);
    expect(result.nextCursor).toBeNull();
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      take: 4,
      skip: 0,
      where: { is_active: true },
      orderBy: { created_at: "desc" },
      select: userSelect,
    });
  });

  it("returns next cursor when there are more results", async () => {
    const users = Array.from({ length: 4 }, (_, i) =>
      mockUser({ id: String(i + 1), name: `User ${i + 1}` }),
    );
    vi.mocked(prisma.user.findMany).mockResolvedValue(users);

    const result = await getUsersPaginated({ pageSize: 3 });

    expect(result.users).toHaveLength(3);
    expect(result.nextCursor).toBe("3");
  });

  it("filters users by search term", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      mockUser({ id: "1", name: "Alice", email: "alice@b.com" }),
    ]);

    const result = await getUsersPaginated({ search: "alice" });

    expect(result.users).toHaveLength(1);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: "alice", mode: "insensitive" } },
            { email: { contains: "alice", mode: "insensitive" } },
          ],
          is_active: true,
        },
      }),
    );
  });

  it("returns empty array when no matches", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);

    const result = await getUsersPaginated({ search: "nonexistent" });

    expect(result.users).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  it("propagates database errors", async () => {
    const error = new Error("connection failed");
    vi.mocked(prisma.user.findMany).mockRejectedValue(error);

    await expect(getUsersPaginated({})).rejects.toThrow(error);
  });
});
