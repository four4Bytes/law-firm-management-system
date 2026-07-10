import type { Preview } from "@storybook/nextjs-vite";

import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/600.css";
import "@fontsource/roboto/700.css";
import "@/styles/globals.css";
import "@/styles/variables.css";

const preview: Preview = {
  parameters: {
    layout: "centered",
    controls: {
      disableSaveFromUI: true,
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: "todo",
    },
  },
};

export default preview;
