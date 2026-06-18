import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { StatCard } from "@/components/ui/StatCard/StatCard";

const meta: Meta<typeof StatCard> = {
  component: StatCard,
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    value: { control: "number" },
    accent: {
      control: { type: "select" },
      options: ["open", "scheduled", "users", "overdue", undefined],
    },
  },
};

export default meta;

type Story = StoryObj<typeof StatCard>;

export const Open: Story = {
  args: {
    label: "Open Cases",
    value: 24,
    accent: "open",
  },
};

export const Scheduled: Story = {
  args: {
    label: "Today Consultations",
    value: 8,
    accent: "scheduled",
  },
};

export const Users: Story = {
  args: {
    label: "Total Users",
    value: 42,
    accent: "users",
  },
};

export const Overdue: Story = {
  args: {
    label: "Overdue Milestones",
    value: 5,
    accent: "overdue",
  },
};

export const NoAccent: Story = {
  args: {
    label: "Total Revenue",
    value: 0,
  },
};

export const LargeNumber: Story = {
  args: {
    label: "Total Documents",
    value: 1024,
    accent: "users",
  },
};
