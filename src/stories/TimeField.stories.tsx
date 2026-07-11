import { Time } from "@internationalized/date";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { TimeField } from "@/components/ui/TimeField/TimeField";

const meta: Meta<typeof TimeField> = {
  component: TimeField,
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

type Story = StoryObj<typeof TimeField>;

export const Default: Story = {
  args: {
    label: "Time",
  },
};

export const WithDescription: Story = {
  args: {
    label: "Appointment Time",
    description: "Select the time of the appointment.",
  },
};

export const WithValue: Story = {
  args: {
    label: "Meeting Time",
    value: new Time(14, 30),
  },
};

export const WithError: Story = {
  args: {
    label: "Event Time",
    isInvalid: true,
    errorMessage: "A valid time is required.",
  },
};

export const Disabled: Story = {
  args: {
    label: "Disabled",
    value: new Time(9, 0),
    isDisabled: true,
  },
};

export const Required: Story = {
  args: {
    label: "Deadline Time",
    isRequired: true,
  },
};
