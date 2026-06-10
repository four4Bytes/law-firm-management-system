import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Select, SelectItem } from "@/components/ui/Select/Select";

const meta: Meta<typeof Select> = {
  component: Select,
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => (
    <Select label="Animal" style={{ width: 220 }}>
      <SelectItem id="aardvark">Aardvark</SelectItem>
      <SelectItem id="cat">Cat</SelectItem>
      <SelectItem id="dog">Dog</SelectItem>
      <SelectItem id="kangaroo">Kangaroo</SelectItem>
      <SelectItem id="panda">Panda</SelectItem>
      <SelectItem id="snake">Snake</SelectItem>
    </Select>
  ),
};

export const WithDescription: Story = {
  render: () => (
    <Select label="Animal" description="Please select an animal." style={{ width: 220 }}>
      <SelectItem id="aardvark">Aardvark</SelectItem>
      <SelectItem id="cat">Cat</SelectItem>
      <SelectItem id="dog">Dog</SelectItem>
      <SelectItem id="kangaroo">Kangaroo</SelectItem>
      <SelectItem id="panda">Panda</SelectItem>
    </Select>
  ),
};

export const WithError: Story = {
  render: () => (
    <Select
      label="Case Type"
      isInvalid
      errorMessage="This field is required."
      style={{ width: 220 }}
    >
      <SelectItem id="civil">Civil</SelectItem>
      <SelectItem id="criminal">Criminal</SelectItem>
      <SelectItem id="family">Family</SelectItem>
    </Select>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Select label="Animal" isDisabled defaultValue="cat" style={{ width: 220 }}>
      <SelectItem id="cat">Cat</SelectItem>
      <SelectItem id="dog">Dog</SelectItem>
    </Select>
  ),
};

export const Required: Story = {
  render: () => (
    <Select label="Animal" isRequired style={{ width: 220 }}>
      <SelectItem id="aardvark">Aardvark</SelectItem>
      <SelectItem id="cat">Cat</SelectItem>
      <SelectItem id="dog">Dog</SelectItem>
    </Select>
  ),
};
