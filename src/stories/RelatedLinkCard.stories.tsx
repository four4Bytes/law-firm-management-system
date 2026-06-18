import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FaFolderOpen } from "react-icons/fa6";

import { RelatedLinkCard } from "@/components/ui/RelatedLinkCard/RelatedLinkCard";

const meta: Meta<typeof RelatedLinkCard> = {
  component: RelatedLinkCard,
  tags: ["autodocs"],
  argTypes: {
    href: { control: "text" },
    label: { control: "text" },
    title: { control: "text" },
  },
};

export default meta;

type Story = StoryObj<typeof RelatedLinkCard>;

export const Default: Story = {
  args: {
    href: "/case/123",
    label: "Related Case",
    title: "Smith vs. Corporation",
  },
};

export const WithIcon: Story = {
  args: {
    href: "/case/456",
    label: "Source Case",
    title: "Estate of Johnson",
    icon: <FaFolderOpen />,
  },
};
