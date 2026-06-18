import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@/components/ui/Tabs/Tabs";

const meta = {
  component: Tabs,
  tags: ["autodocs"],
} as Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs style={{ width: 400 }}>
      <TabList>
        <Tab id="details">Details</Tab>
        <Tab id="notes">Notes</Tab>
        <Tab id="activity">Activity</Tab>
      </TabList>
      <TabPanels>
        <TabPanel id="details">Case details content goes here.</TabPanel>
        <TabPanel id="notes">Notes and annotations for this case.</TabPanel>
        <TabPanel id="activity">Recent activity log entries.</TabPanel>
      </TabPanels>
    </Tabs>
  ),
};

export const WithDisabledTab: Story = {
  render: () => (
    <Tabs style={{ width: 400 }}>
      <TabList>
        <Tab id="info">Info</Tab>
        <Tab id="documents">Documents</Tab>
        <Tab id="settings" isDisabled>
          Settings
        </Tab>
      </TabList>
      <TabPanels>
        <TabPanel id="info">General information panel.</TabPanel>
        <TabPanel id="documents">Uploaded documents panel.</TabPanel>
        <TabPanel id="settings">Settings are currently unavailable.</TabPanel>
      </TabPanels>
    </Tabs>
  ),
};

export const SingleTab: Story = {
  render: () => (
    <Tabs>
      <TabList>
        <Tab id="overview">Overview</Tab>
      </TabList>
      <TabPanels>
        <TabPanel id="overview">Single tab panel.</TabPanel>
      </TabPanels>
    </Tabs>
  ),
};
