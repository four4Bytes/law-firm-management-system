import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Link } from "@/components/ui/Link/Link";

const meta: Meta<typeof Link> = {
  component: Link,
  tags: ["autodocs"],
  argTypes: {
    href: { control: "text" },
    children: { control: "text" },
  },
};

export default meta;

type Story = StoryObj<typeof Link>;

export const External: Story = {
  args: {
    href: "https://example.com",
    children: "Visit Example",
  },
};

export const Internal: Story = {
  args: {
    href: "/dashboard",
    children: "Go to Dashboard",
  },
};
