import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { StatusDot } from "@/components/ui/StatusDot/StatusDot";

const meta: Meta<typeof StatusDot> = {
  component: StatusDot,
  tags: ["autodocs"],
  argTypes: {
    isOnline: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof StatusDot>;

export const Online: Story = {
  args: {
    isOnline: true,
  },
};

export const Offline: Story = {
  args: {
    isOnline: false,
  },
};
