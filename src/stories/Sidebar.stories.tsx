import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Sidebar } from "@/components/layout/Sidebar/Sidebar";

const meta: Meta<typeof Sidebar> = {
  component: Sidebar,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    initialCollapsed: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof Sidebar>;

export const Expanded: Story = {
  args: {
    initialCollapsed: false,
  },
};

export const Collapsed: Story = {
  args: {
    initialCollapsed: true,
  },
};
