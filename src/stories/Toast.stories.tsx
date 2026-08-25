"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "@/components/ui/Button/Button";
import { ToastRegion } from "@/components/ui/Toast/Toast";
import { toastActionError, toastError, toastInfo, toastSuccess } from "@/lib/toast-utils";

function ToastExample() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
      <Button
        variant="primary"
        onPress={() => toastSuccess("Case created", "The case has been created.")}
      >
        Show Success Toast
      </Button>
      <Button
        variant="secondary"
        onPress={() =>
          toastError("Upload failed", "The file could not be uploaded. Please try again.")
        }
      >
        Show Error Toast
      </Button>
      <Button
        variant="ghost"
        onPress={() => toastInfo("Scheduled reminder", "Your consultation starts in 30 minutes.")}
      >
        Show Info Toast
      </Button>
      <Button
        variant="ghost"
        onPress={() =>
          toastActionError(
            {
              success: false,
              error: {
                code: "forbidden",
                title: "Access denied",
                description: "You do not have permission to perform this action.",
              },
            },
            "delete attachment",
          )
        }
      >
        Show Action Error Toast
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
