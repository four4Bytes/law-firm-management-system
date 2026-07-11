import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Calendar } from "@/components/ui/Calendar/Calendar";

const meta: Meta<typeof Calendar> = {
  component: Calendar,
  tags: ["autodocs"],
  argTypes: {
    errorMessage: { control: "text" },
    isDisabled: { control: "boolean" },
    isReadOnly: { control: "boolean" },
    isInvalid: { control: "boolean" },
    firstDayOfWeek: {
      control: "select",
      options: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    },
  },
};

export default meta;

type Story = StoryObj<typeof Calendar>;

export const Default: Story = {
  args: {
    "aria-label": "Select a date",
  },
};

export const WithToday: Story = {
  args: {
    "aria-label": "Calendar with today",
    defaultFocusedValue: undefined,
  },
};

export const WithError: Story = {
  args: {
    "aria-label": "Calendar with error",
    isInvalid: true,
    errorMessage: "Please select a valid date.",
  },
};

export const Disabled: Story = {
  args: {
    "aria-label": "Disabled calendar",
    isDisabled: true,
  },
};

export const WeekStartsMonday: Story = {
  args: {
    "aria-label": "Week starts Monday",
    firstDayOfWeek: "mon",
  },
};

export const ReadOnly: Story = {
  args: {
    "aria-label": "Read-only calendar",
    isReadOnly: true,
  },
};
