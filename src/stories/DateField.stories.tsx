import { parseDate } from "@internationalized/date";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { DateField } from "@/components/ui/DateField/DateField";

const meta: Meta<typeof DateField> = {
  component: DateField,
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    description: { control: "text" },
    errorMessage: { control: "text" },
    isDisabled: { control: "boolean" },
    isReadOnly: { control: "boolean" },
    isRequired: { control: "boolean" },
    isInvalid: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof DateField>;

export const Default: Story = {
  args: {
    label: "Due Date",
  },
};

export const WithDescription: Story = {
  args: {
    label: "Hearing Date",
    description: "Select the date of the court hearing.",
  },
};

export const WithValue: Story = {
  args: {
    label: "Milestone Date",
    value: parseDate("2026-12-15"),
  },
};

export const WithError: Story = {
  args: {
    label: "Appointment Date",
    isInvalid: true,
    errorMessage: "A valid date is required.",
  },
};

export const Disabled: Story = {
  args: {
    label: "Disabled",
    value: parseDate("2026-07-11"),
    isDisabled: true,
  },
};

export const Required: Story = {
  args: {
    label: "Deadline",
    isRequired: true,
  },
};
