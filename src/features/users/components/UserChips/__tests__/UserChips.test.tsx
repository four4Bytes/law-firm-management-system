// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UserChips } from "../UserChips";

afterEach(cleanup);

const users = [
  { id: "u1", name: "Alice", is_online: true },
  { id: "u2", name: "Bob", is_online: false },
];

describe("UserChips", () => {
  it("renders names with no remove buttons by default", () => {
    render(<UserChips users={users} />);

    expect(screen.getByText("Alice")).not.toBeNull();
    expect(screen.getByText("Bob")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Remove Alice" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove Bob" })).toBeNull();
  });

  it("calls onRemove with the user id when a remove button is clicked", () => {
    const onRemove = vi.fn();
    render(<UserChips users={users} onRemove={onRemove} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove Bob" }));

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith("u2");
  });

  it("disables the remove buttons when isDisabled", () => {
    render(<UserChips users={users} onRemove={() => {}} isDisabled />);

    expect(screen.getByRole("button", { name: "Remove Alice" }).hasAttribute("disabled")).toBe(
      true,
    );
  });
});
