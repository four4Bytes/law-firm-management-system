import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Separator } from "@/components/ui/Separator/Separator";

const meta: Meta<typeof Separator> = {
  component: Separator,
  tags: ["autodocs"],
  argTypes: {
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
    },
  },
};

export default meta;

type Story = StoryObj<typeof Separator>;

export const Horizontal: Story = {
  args: {
    orientation: "horizontal",
  },
};

export const Vertical: Story = {
  args: {
    orientation: "vertical",
  },
  render: (args) => (
    <div style={{ display: "flex", gap: "24px", height: "120px", alignItems: "stretch" }}>
      <div>Left content</div>
      <Separator {...args} />
      <div>Right content</div>
    </div>
  ),
};

export const VerticalInModalColumns: Story = {
  args: {
    orientation: "vertical",
  },
  render: (args) => (
    <div style={{ display: "flex", gap: "24px", textAlign: "left" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>Client Name field</div>
        <div>Phone field</div>
      </div>
      <Separator {...args} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>Case Title field</div>
        <div>Case Type field</div>
      </div>
    </div>
  ),
};
