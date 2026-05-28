"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { Button } from "@/components/ui/Button/Button";
import { Modal } from "@/components/ui/Modal/Modal";

function ModalWithTrigger({ title, children }: { title: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onPress={() => setIsOpen(true)}>Open Modal</Button>
      <Modal isOpen={isOpen} onOpenChange={setIsOpen} title={title}>
        {children}
      </Modal>
    </>
  );
}

const meta: Meta<typeof ModalWithTrigger> = {
  component: ModalWithTrigger,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ModalWithTrigger>;

export const Default: Story = {
  args: {
    title: "Modal Title",
    children: "Modal content goes here.",
  },
};

export const WithAction: Story = {
  args: {
    title: "Confirm Action",
    children: (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "30px",
        }}
      >
        <p>Are you sure you wanna DELETE the thing? whats the thing? I dont fucking know man.</p>
        <div
          style={{
            display: "flex",
            gap: "20px",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Button variant="secondary">Cancel</Button>
          <Button variant="primary">Delete</Button>
        </div>
      </div>
    ),
  },
};

export const LongMessage: Story = {
  args: {
    title: "Sign-in Error",
    children:
      "There was a problem signing in with Google. An unexpected authentication error occurred. Please try again or contact your administrator.",
  },
};
