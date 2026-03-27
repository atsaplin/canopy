import { ManifestV3Export } from "@crxjs/vite-plugin";

const manifest: ManifestV3Export = {
  manifest_version: 3,
  name: "Canopy",
  short_name: "Canopy",
  version: "3.0.0",
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
    default_title: "Canopy",
    default_popup: "src/ui/popup/index.html",
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
  commands: {
    _execute_action: {
      suggested_key: {
        windows: "Alt+Q",
        mac: "Alt+Q",
        linux: "Alt+Q",
        chromeos: "Alt+Q",
      },
    },
    "open-side-panel": {
      suggested_key: {
        windows: "Alt+S",
        mac: "Alt+S",
        linux: "Alt+S",
        chromeos: "Alt+S",
      },
      description: "Open or focus the side panel",
    },
  },
};

export default manifest;
