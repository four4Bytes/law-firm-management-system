import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LoginCard } from "./LoginCard";

const meta: Meta<typeof LoginCard> = {
  component: LoginCard,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof LoginCard>;

export const Primary: Story = {};
