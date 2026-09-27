import { type User } from "@/generated/prisma/browser";

// A user as rendered in pickers, chips, and display rows: identity, label, and
// presence. Not named "Active" because merging a directory back together can
// reintroduce deactivated users that are no longer in the active set.
export type UserSummary = Pick<User, "id" | "name"> & { is_online: boolean };
