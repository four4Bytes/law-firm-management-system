"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TooltipTrigger } from "react-aria-components";
import { FaPencil } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { Tooltip } from "@/components/ui/Tooltip/Tooltip";

function TooltipWithTrigger({
  placement,
  children,
}: {
  placement?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: "8rem" }}>
      <TooltipTrigger>
        <Button aria-label="Edit">
          <FaPencil />
        </Button>
        <Tooltip placement={placement}>{children}</Tooltip>
      </TooltipTrigger>
    </div>
  );
}

const meta: Meta<typeof TooltipWithTrigger> = {
  component: TooltipWithTrigger,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof TooltipWithTrigger>;

export const Default: Story = {
  args: {
    children: "Edit",
  },
};

export const PlacementTop: Story = {
  args: {
    placement: "top",
    children: "Placed above the trigger.",
  },
};

export const PlacementBottom: Story = {
  args: {
    placement: "bottom",
    children: "Placed below the trigger.",
  },
};

export const PlacementLeft: Story = {
  args: {
    placement: "left",
    children: "Placed to the left of the trigger.",
  },
};

export const PlacementRight: Story = {
  args: {
    placement: "right",
    children: "Placed to the right of the trigger.",
  },
};

export const LongText: Story = {
  args: {
    children:
      "A longer description that wraps within the tooltip max width to preview multiline content.",
  },
};
