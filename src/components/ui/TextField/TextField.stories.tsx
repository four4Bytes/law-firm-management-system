import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { TextField } from './TextField';

const meta: Meta<typeof TextField> = {
  component: TextField,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    description: { control: 'text' },
    errorMessage: { control: 'text' },
    placeholder: { control: 'text' },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'url', 'tel', 'search'],
    },
    isDisabled: { control: 'boolean' },
    isReadOnly: { control: 'boolean' },
    isRequired: { control: 'boolean' },
    isInvalid: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof TextField>;

export const Default: Story = {
  args: {
    label: 'Name',
    placeholder: 'Enter your name',
  },
};

export const WithDescription: Story = {
  args: {
    label: 'Email',
    placeholder: 'you@example.com',
    description: "We'll never share your email.",
  },
};

export const Password: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    description: 'At least 8 characters.',
  },
};

export const WithError: Story = {
  args: {
    label: 'Case Number',
    placeholder: 'e.g. C-2024-001',
    isInvalid: true,
    errorMessage: 'This field is required.',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled',
    defaultValue: "Can't touch this",
    isDisabled: true,
  },
};

export const Required: Story = {
  args: {
    label: 'Case Number',
    placeholder: 'e.g. C-2024-001',
    isRequired: true,
  },
};
