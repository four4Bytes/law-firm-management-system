import { expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";

import { upsertDeveloperUser } from "../mutations";

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { upsert: vi.fn() } },
}));

it("creates developer user on upsert", async () => {
  vi.mocked(prisma.user.upsert).mockResolvedValue({
    id: "1",
    name: "Dev User",
    email: "dev@example.com",
    google_sub: null,
    role: "Dev",
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    emailVerified: null,
    image: null,
  });

  const result = await upsertDeveloperUser("dev@example.com", "Dev User");

  expect(result.email).toBe("dev@example.com");
  expect(result.name).toBe("Dev User");
  expect(result.role).toBe("Dev");
  expect(result.is_active).toBe(true);
  expect(prisma.user.upsert).toHaveBeenCalledWith({
    where: { email: "dev@example.com" },
    update: { name: "Dev User", image: undefined },
    create: {
      email: "dev@example.com",
      name: "Dev User",
      role: "Dev",
      is_active: true,
    },
  });
});

it("passes through dynamic email and name arguments", async () => {
  vi.mocked(prisma.user.upsert).mockResolvedValue({
    id: "2",
    name: "Other User",
    email: "other@example.com",
    google_sub: null,
    role: "Dev",
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    emailVerified: null,
    image: null,
  });

  await upsertDeveloperUser("other@example.com", "Other User");

  expect(prisma.user.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { email: "other@example.com" },
      create: expect.objectContaining({
        email: "other@example.com",
        name: "Other User",
      }),
    }),
  );
});
