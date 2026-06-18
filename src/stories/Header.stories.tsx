import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Header } from "@/components/layout/Header/Header";

const meta: Meta<typeof Header> = {
  component: Header,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;

type Story = StoryObj<typeof Header>;

export const LoggedIn: Story = {
  args: {
    userName: "Jane Smith",
    userRole: "Admin",
    userImage: null,
  },
};

export const WithAvatar: Story = {
  args: {
    userName: "John Doe",
    userRole: "Lawyer",
    userImage: "https://i.pravatar.cc/150?u=john",
  },
};

export const Minimal: Story = {
  args: {
    userImage: null,
  },
};
