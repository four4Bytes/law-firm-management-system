import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Radio, RadioGroup } from "@/components/ui/RadioGroup/RadioGroup";

const meta: Meta<typeof RadioGroup> = {
  component: RadioGroup,
  tags: ["autodocs"],
  argTypes: {
    isDisabled: { control: "boolean" },
    orientation: { control: { type: "select" }, options: ["horizontal", "vertical"] },
  },
};

export default meta;

type Story = StoryObj<typeof RadioGroup>;

export const Default: Story = {
  render: () => (
    <RadioGroup label="Reminder frequency" defaultValue="key">
      <Radio value="key" description="Only 3 days before and on the due date">
        Key days only
      </Radio>
      <Radio value="daily" description="Every day from 3 days before until the due date">
        Daily
      </Radio>
    </RadioGroup>
  ),
};

export const WithDueDateOnly: Story = {
  render: () => (
    <RadioGroup label="Reminder frequency" defaultValue="key">
      <Radio value="key" description="Only on the due date">
        Key days only
      </Radio>
      <Radio value="daily" description="Only on the due date">
        Daily
      </Radio>
    </RadioGroup>
  ),
};

export const Disabled: Story = {
  render: () => (
    <RadioGroup label="Reminder frequency" isDisabled defaultValue="daily">
      <Radio value="key" description="Only 3 days before and on the due date">
        Key days only
      </Radio>
      <Radio value="daily" description="Every day from 3 days before until the due date">
        Daily
      </Radio>
    </RadioGroup>
  ),
};

export const WithError: Story = {
  render: () => (
    <RadioGroup label="Reminder frequency" isInvalid errorMessage="Please select a frequency.">
      <Radio value="key">Key days only</Radio>
      <Radio value="daily">Daily</Radio>
    </RadioGroup>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <RadioGroup label="Choose option" orientation="horizontal" defaultValue="a">
      <Radio value="a">Option A</Radio>
      <Radio value="b">Option B</Radio>
      <Radio value="c">Option C</Radio>
    </RadioGroup>
  ),
};
