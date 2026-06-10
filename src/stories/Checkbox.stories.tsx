import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Checkbox } from "@/components/ui/Checkbox/Checkbox";

const meta: Meta<typeof Checkbox> = {
  component: Checkbox,
  tags: ["autodocs"],
  argTypes: {
    children: { control: "text" },
    isIndeterminate: { control: "boolean" },
    isDisabled: { control: "boolean" },
    defaultSelected: { control: "boolean" },
  },
};
export default meta;

type Story = StoryObj<typeof Checkbox>;

export const Unselected: Story = {
  args: {
    children: "Subscribe to newsletter",
    defaultSelected: false,
  },
};

export const Selected: Story = {
  args: {
    children: "Subscribe to newsletter",
    defaultSelected: true,
  },
};

export const Indeterminate: Story = {
  args: {
    children: "Subscribe to newsletter",
    isIndeterminate: true,
  },
};

export const Disabled: Story = {
  args: {
    children: "Subscribe to newsletter",
    isDisabled: true,
  },
};

export const DisabledSelected: Story = {
  args: {
    children: "Subscribe to newsletter",
    defaultSelected: true,
    isDisabled: true,
  },
};
