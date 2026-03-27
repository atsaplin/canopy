import { create } from "zustand";

export interface Settings {
  showDecayIndicators: boolean;
  alwaysShowTabAge: boolean;
  indentSize: number;
  confirmCloseTree: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  showDecayIndicators: true,
  alwaysShowTabAge: false,
  indentSize: 16,
  confirmCloseTree: false,
};

interface SettingsState extends Settings {
  loaded: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...DEFAULT_SETTINGS,
  loaded: false,

  loadSettings: async () => {
    if (typeof chrome === "undefined" || !chrome.storage) return;
    const result = await chrome.storage.local.get("canopy_settings");
    if (result.canopy_settings) {
      const saved = result.canopy_settings as Partial<Settings>;
      set({
        showDecayIndicators: saved.showDecayIndicators ?? DEFAULT_SETTINGS.showDecayIndicators,
        alwaysShowTabAge: saved.alwaysShowTabAge ?? DEFAULT_SETTINGS.alwaysShowTabAge,
        indentSize: saved.indentSize ?? DEFAULT_SETTINGS.indentSize,
        confirmCloseTree: saved.confirmCloseTree ?? DEFAULT_SETTINGS.confirmCloseTree,
        loaded: true,
      });
    } else {
      set({ loaded: true });
    }
  },

  updateSettings: async (partial) => {
    const current = get();
    const newSettings: Settings = {
      showDecayIndicators: partial.showDecayIndicators ?? current.showDecayIndicators,
      alwaysShowTabAge: partial.alwaysShowTabAge ?? current.alwaysShowTabAge,
      indentSize: partial.indentSize ?? current.indentSize,
      confirmCloseTree: partial.confirmCloseTree ?? current.confirmCloseTree,
    };
    set(newSettings);
    if (typeof chrome !== "undefined" && chrome.storage) {
      await chrome.storage.local.set({ canopy_settings: newSettings });
    }
  },
}));
