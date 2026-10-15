// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { updateCaseWithClientAction } from "@/features/cases/actions";
import { CaseType } from "@/features/cases/constants";
import type { CaseEditData } from "@/features/cases/queries";
import type { ClientEditData } from "@/features/clients/queries";
import { CaseStatus } from "@/generated/prisma/browser";
import { toastError } from "@/lib/hooks/toast-utils";

import { EditCaseModal } from "../EditCaseModal";

vi.mock("@/features/cases/actions", () => ({
  updateCaseWithClientAction: vi.fn(),
}));

vi.mock("@/lib/hooks/toast-utils", () => ({
  toastActionError: vi.fn(),
  toastError: vi.fn(),
  toastNotFound: vi.fn(),
  toastSuccess: vi.fn(),
}));

afterEach(cleanup);

const uuid = "550e8400-e29b-41d4-a716-446655440000";

const clientData: ClientEditData = {
  id: uuid,
  name: "John Doe",
  email: null,
  phone_number: "09170000001",
  address: null,
};

function caseData(overrides: Partial<CaseEditData> = {}): CaseEditData {
  return {
    id: uuid,
    client_id: uuid,
    case_title: "Gonzales Legal Separation",
    case_type: "Family Law",
    status: CaseStatus.Open,
    parties_involved: null,
    source_consultation_id: null,
    assignee_ids: [],
    assignees: [],
    ...overrides,
  };
}

function renderModal(data: CaseEditData = caseData()) {
  render(
    <EditCaseModal
      isOpen
      onOpenChange={vi.fn()}
      onSuccess={vi.fn()}
      caseData={data}
      clientData={clientData}
      users={[]}
    />,
  );
}

describe("EditCaseModal case type", () => {
  it("shows the legacy value in the trigger instead of a blank field", () => {
    renderModal();

    expect(screen.getByRole("button", { name: /Family Law/ })).not.toBeNull();
  });

  it("lists the four categories as selectable options", async () => {
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: /Family Law/ }));

    for (const type of Object.values(CaseType)) {
      expect(await screen.findByRole("option", { name: type })).not.toBeNull();
    }
  });

  it("blocks the save with an inline error until a category is picked", async () => {
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText(/Select a case type/)).not.toBeNull();
    expect(vi.mocked(toastError)).not.toHaveBeenCalled();
    expect(vi.mocked(updateCaseWithClientAction)).not.toHaveBeenCalled();
  });

  it("saves with the picked category", async () => {
    vi.mocked(updateCaseWithClientAction).mockResolvedValue({ success: true });
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: /Family Law/ }));
    fireEvent.click(await screen.findByRole("option", { name: CaseType.Civil }));

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(updateCaseWithClientAction).toHaveBeenCalledWith(
        expect.objectContaining({
          case: expect.objectContaining({ case_type: CaseType.Civil }),
        }),
      );
    });
  });
});
