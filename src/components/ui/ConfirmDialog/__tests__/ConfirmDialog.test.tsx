// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import buttonStyles from "@/components/ui/Button/Button.module.css";

import { ConfirmDialog } from "../ConfirmDialog";

afterEach(cleanup);

function renderDialog(props?: { cancelVariant?: "outline"; confirmVariant?: "danger" }) {
  const onConfirm = vi.fn();
  render(
    <ConfirmDialog
      isOpen
      onOpenChange={() => {}}
      title="Delete subtask?"
      confirmLabel="Delete subtask"
      onConfirm={onConfirm}
      {...props}
    >
      Are you sure?
    </ConfirmDialog>,
  );
  return { onConfirm };
}

describe("ConfirmDialog", () => {
  it("renders the default secondary cancel and primary confirm buttons", () => {
    renderDialog();
    expect(screen.getByRole("button", { name: "Cancel" }).className).toContain(
      buttonStyles.secondary,
    );
    expect(screen.getByRole("button", { name: "Delete subtask" }).className).toContain(
      buttonStyles.primary,
    );
  });

  it("applies custom cancel and confirm variants", () => {
    renderDialog({ cancelVariant: "outline", confirmVariant: "danger" });
    expect(screen.getByRole("button", { name: "Cancel" }).className).toContain(
      buttonStyles.outline,
    );
    expect(screen.getByRole("button", { name: "Delete subtask" }).className).toContain(
      buttonStyles.danger,
    );
  });

  it("confirms through the custom confirm button", () => {
    const { onConfirm } = renderDialog({ cancelVariant: "outline", confirmVariant: "danger" });
    fireEvent.click(screen.getByRole("button", { name: "Delete subtask" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
