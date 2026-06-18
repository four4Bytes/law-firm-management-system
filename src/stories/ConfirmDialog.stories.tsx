"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { Button } from "@/components/ui/Button/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog/ConfirmDialog";

function ConfirmDialogWithTrigger({
  title,
  children,
  confirmLabel = "Confirm",
}: {
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onPress={() => setIsOpen(true)}>Open Dialog</Button>
      <ConfirmDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title={title}
        confirmLabel={confirmLabel}
        onConfirm={() => setIsOpen(false)}
      >
        {children}
      </ConfirmDialog>
    </>
  );
}

const meta: Meta<typeof ConfirmDialogWithTrigger> = {
  component: ConfirmDialogWithTrigger,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ConfirmDialogWithTrigger>;

export const Default: Story = {
  args: {
    title: "Confirm Delete",
    children: "Are you sure you want to delete this item? This action cannot be undone.",
  },
};

export const CustomLabel: Story = {
  args: {
    title: "Deactivate User",
    confirmLabel: "Deactivate",
    children: "This user will lose access to the system. Are you sure?",
  },
};
