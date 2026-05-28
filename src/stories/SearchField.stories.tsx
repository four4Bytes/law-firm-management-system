import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SearchField } from "@/components/ui/SearchField/SearchField";

const meta: Meta<typeof SearchField> = {
  component: SearchField,
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    description: { control: "text" },
    errorMessage: { control: "text" },
    placeholder: { control: "text" },
    value: { control: "text" },
    defaultValue: { control: "text" },
    isDisabled: { control: "boolean" },
    isReadOnly: { control: "boolean" },
    isInvalid: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof SearchField>;

export const Default: Story = {
  args: {
    placeholder: "Search cases, consultations...",
  },
};

export const WithLabel: Story = {
  args: {
    label: "Search",
    placeholder: "Search...",
  },
};

export const WithValue: Story = {
  args: {
    label: "Search",
    defaultValue: "Smith",
    placeholder: "Search...",
  },
};

export const WithDescription: Story = {
  args: {
    label: "Search",
    placeholder: "Search...",
    description: "Search by case name or number.",
  },
};

export const Disabled: Story = {
  args: {
    label: "Search",
    isDisabled: true,
    placeholder: "Search...",
  },
};
