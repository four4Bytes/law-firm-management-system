import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ListBox, ListBoxItem } from "@/components/ui/ListBox/ListBox";

const meta: Meta<typeof ListBox> = {
  component: ListBox,
  tags: ["autodocs"],
  argTypes: {
    selectionMode: {
      control: "select",
      options: ["none", "single", "multiple"],
    },
    disabledKeys: { control: "object" },
  },
};

export default meta;

type Story = StoryObj<typeof ListBox>;

export const Default: Story = {
  render: () => (
    <ListBox aria-label="Favorite animal" style={{ width: 200 }}>
      <ListBoxItem id="aardvark">Aardvark</ListBoxItem>
      <ListBoxItem id="cat">Cat</ListBoxItem>
      <ListBoxItem id="dog">Dog</ListBoxItem>
      <ListBoxItem id="kangaroo">Kangaroo</ListBoxItem>
      <ListBoxItem id="panda">Panda</ListBoxItem>
      <ListBoxItem id="snake">Snake</ListBoxItem>
    </ListBox>
  ),
};

export const WithSelection: Story = {
  render: () => (
    <ListBox
      aria-label="Favorite animal"
      selectionMode="multiple"
      defaultSelectedKeys={["cat", "dog"]}
      style={{ width: 200 }}
    >
      <ListBoxItem id="cat">Cat</ListBoxItem>
      <ListBoxItem id="dog">Dog</ListBoxItem>
      <ListBoxItem id="kangaroo">Kangaroo</ListBoxItem>
      <ListBoxItem id="panda">Panda</ListBoxItem>
    </ListBox>
  ),
};

export const WithDisabledItems: Story = {
  render: () => (
    <ListBox
      aria-label="Favorite animal"
      selectionMode="single"
      disabledKeys={["platypus"]}
      style={{ width: 200 }}
    >
      <ListBoxItem id="koala">Koala</ListBoxItem>
      <ListBoxItem id="kangaroo">Kangaroo</ListBoxItem>
      <ListBoxItem id="platypus" isDisabled>
        Platypus
      </ListBoxItem>
      <ListBoxItem id="eagle">Bald Eagle</ListBoxItem>
    </ListBox>
  ),
};

export const Empty: Story = {
  render: () => (
    <ListBox
      aria-label="Search results"
      renderEmptyState={() => "No items found."}
      style={{ width: 200 }}
    >
      {[]}
    </ListBox>
  ),
};
