import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FaCalendarDay, FaScaleBalanced, FaTriangleExclamation, FaUsers } from "react-icons/fa6";

import { StatCard } from "@/components/ui/StatCard/StatCard";

const meta: Meta<typeof StatCard> = {
  component: StatCard,
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text" },
    value: { control: "number" },
    subtitle: { control: "text" },
    href: { control: "text" },
    ariaLabel: { control: "text" },
  },
};

export default meta;

type Story = StoryObj<typeof StatCard>;

export const Open: Story = {
  args: {
    label: "Open Cases",
    value: 24,
    subtitle: "active matters",
    icon: <FaScaleBalanced aria-hidden="true" />,
  },
};

export const Scheduled: Story = {
  args: {
    label: "Today Consultations",
    value: 8,
    subtitle: "scheduled for today",
    icon: <FaCalendarDay aria-hidden="true" />,
  },
};

export const Users: Story = {
  args: {
    label: "Total Users",
    value: 42,
    subtitle: "active accounts",
    icon: <FaUsers aria-hidden="true" />,
  },
};

export const Overdue: Story = {
  args: {
    label: "Overdue Milestones",
    value: 5,
    subtitle: "needs attention",
    icon: <FaTriangleExclamation aria-hidden="true" />,
  },
};

export const NoIcon: Story = {
  args: {
    label: "Total Revenue",
    value: 0,
  },
};

export const LargeNumber: Story = {
  args: {
    label: "Total Documents",
    value: 1024,
    subtitle: "stored files",
    icon: <FaUsers aria-hidden="true" />,
  },
};

export const Linked: Story = {
  args: {
    label: "Open Cases",
    value: 24,
    subtitle: "active matters",
    icon: <FaScaleBalanced aria-hidden="true" />,
    href: "/case?status=Open",
    ariaLabel: "View open cases",
  },
};
