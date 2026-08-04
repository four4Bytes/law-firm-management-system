import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { StatusBadge } from "@/components/ui/StatusBadge/StatusBadge";

const meta: Meta<typeof StatusBadge> = {
  component: StatusBadge,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["pending", "ongoing", "info", "done", "cancelled"],
    },
    children: { control: "text" },
  },
};

export default meta;

type Story = StoryObj<typeof StatusBadge>;

export const Pending: Story = {
  args: {
    variant: "pending",
    children: "Pending",
  },
};

export const Ongoing: Story = {
  args: {
    variant: "ongoing",
    children: "Ongoing",
  },
};

export const Info: Story = {
  args: {
    variant: "info",
    children: "Submitted",
  },
};

export const Done: Story = {
  args: {
    variant: "done",
    children: "Paid",
  },
};

export const Cancelled: Story = {
  args: {
    variant: "cancelled",
    children: "Refunded",
  },
};
