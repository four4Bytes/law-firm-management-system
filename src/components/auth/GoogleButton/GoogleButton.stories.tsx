import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { GoogleButton } from "./GoogleButton";

const meta: Meta<typeof GoogleButton> = {
  component: GoogleButton,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof GoogleButton>;

export const Primary: Story = {};
