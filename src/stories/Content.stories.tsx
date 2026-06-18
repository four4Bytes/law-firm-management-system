import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Header, Text } from "@/components/ui/Content/Content";

const meta: Meta<typeof Text> = {
  component: Text,
  tags: ["autodocs"],
  argTypes: {
    slot: { control: "text" },
    elementType: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof Text>;

export const TextDefault: Story = {
  name: "Text",
  args: {
    children: "This is a text component from react-aria-components.",
  },
};

export const HeaderDefault: Story = {
  name: "Header",
  render: () => <Header>Section Header</Header>,
};

export const HeaderWithText: Story = {
  name: "Header + Text",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Header>Case Overview</Header>
      <Text slot="description">Details and status of the selected case.</Text>
    </div>
  ),
};
