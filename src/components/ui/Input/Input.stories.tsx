import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input } from "./Input";

const meta: Meta<typeof Input> = {
  component: Input,
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    description: { control: "text" },
    placeholder: { control: "text" },
    isDisabled: { control: "boolean" },
    isReadOnly: { control: "boolean" },
    isRequired: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    label: "Name",
    placeholder: "Enter your name",
  },
};

export const WithDescription: Story = {
  args: {
    label: "Email",
    placeholder: "you@example.com",
    description: "We'll never share your email.",
  },
};

export const Disabled: Story = {
  args: {
    label: "Disabled",
    defaultValue: "Can't touch this",
    isDisabled: true,
  },
};

export const Required: Story = {
  args: {
    label: "Case Number",
    placeholder: "e.g. C-2024-001",
    isRequired: true,
  },
};
