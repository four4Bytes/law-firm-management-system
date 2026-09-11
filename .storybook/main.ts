import type { StorybookConfig } from "@storybook/nextjs-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: ["@storybook/addon-vitest", "@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: "@storybook/nextjs-vite",
  async viteFinal(viteConfig) {
    if (process.env.BASE_URL) {
      viteConfig.base = process.env.BASE_URL;
    }
    return viteConfig;
  },
};
export default config;
