import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "@/components/ui/Button/Button";

import { Modal } from "./Modal";

const meta: Meta<typeof Modal> = {
  component: Modal,
  tags: ["autodocs"],
  argTypes: {
    isOpen: { control: "boolean" },
    title: { control: "text" },
    onOpenChange: { action: "openChanged" },
  },
  args: {
    isOpen: true,
    title: "Modal Title",
    children: "Modal content goes here.",
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const Default: Story = {};

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
