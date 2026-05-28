import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "@/components/ui/Button/Button";

const meta: Meta<typeof Button> = {
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["primary", "secondary", "navigation", "ghost"],
    },
    children: { control: "text" },
    "aria-disabled": { control: "boolean" },
  },
};
export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: "primary",
    children: "Primary Button",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Secondary Button",
  },
};

export const Navigation: Story = {
  args: {
    variant: "navigation",
    children: "Navigation Button",
  },
};

export const Ghost: Story = {
  args: {
    variant: "ghost",
    children: "Ghost Button",
  },
};
