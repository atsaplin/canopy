import { ManifestV3Export } from "@crxjs/vite-plugin";

const manifest: ManifestV3Export = {
  manifest_version: 3,
  name: "Canopy",
  short_name: "Canopy",
  version: "3.1.0",
  description:
    "A tree-style tab viewer with agent-aware browsing and session intelligence",
  permissions: ["bookmarks", "tabs", "tabGroups", "storage", "sidePanel"],
  side_panel: {
    default_path: "src/ui/sidepanel/index.html",
  },
  background: {
    service_worker: "src/background/index.ts",
  },
  action: {
    default_title: "Open Canopy",
    default_icon: {
      16: "public/images/icon-16.png",
      32: "public/images/icon-32.png",
      48: "public/images/icon-48.png",
      128: "public/images/icon-128.png",
    },
  },
  icons: {
    16: "public/images/icon-16.png",
    32: "public/images/icon-32.png",
    48: "public/images/icon-48.png",
    128: "public/images/icon-128.png",
  },
  options_ui: {
    page: "src/ui/options/index.html",
    open_in_tab: true,
  },
  commands: {
    _execute_action: {
      suggested_key: {
        windows: "Alt+S",
        mac: "Alt+S",
        linux: "Alt+S",
        chromeos: "Alt+S",
      },
      description: "Open side panel",
    },
    "focus-search": {
      suggested_key: {
        windows: "Alt+F",
        mac: "Alt+F",
        linux: "Alt+F",
        chromeos: "Alt+F",
      },
      description: "Focus search in side panel",
    },
    "copy-context": {
      suggested_key: {
        windows: "Alt+C",
        mac: "Alt+C",
        linux: "Alt+C",
        chromeos: "Alt+C",
      },
      description: "Copy tab context for AI",
    },
    "save-session": {
      description: "Save current session",
    },
  },
};

export default manifest;
