"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "@/components/ui/Button/Button";
import { queue, ToastRegion } from "@/components/ui/Toast/Toast";

function ToastExample() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
      <Button
        variant="primary"
        onPress={() =>
          queue.add({ title: "Action successful", description: "Record has been saved." })
        }
      >
        Show Success Toast
      </Button>
      <Button
        variant="secondary"
        onPress={() => queue.add({ title: "Error occurred", description: "Please try again." })}
      >
        Show Error Toast
      </Button>
      <Button variant="ghost" onPress={() => queue.add({ title: "Just a title" })}>
        Show Minimal Toast
      </Button>
      <ToastRegion />
    </div>
  );
}

const meta: Meta<typeof ToastExample> = {
  component: ToastExample,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ToastExample>;

export const Default: Story = {};
