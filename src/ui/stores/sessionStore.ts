import { create } from "zustand";
import type { SessionListItem } from "@core/types";

interface SessionState {
  sessions: SessionListItem[];
  isLoading: boolean;

  loadSessions: () => Promise<void>;
  saveCurrentSession: (name: string) => Promise<void>;
  restoreSession: (id: string, mode: "replace" | "add") => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  isLoading: false,

  loadSessions: async () => {
    set({ isLoading: true });
    try {
      const response = await chrome.runtime.sendMessage({ action: "LIST_SESSIONS" });
      if (response?.success && response.data?.sessions) {
        set({ sessions: response.data.sessions as SessionListItem[] });
      }
    } catch {
      // SW may not be ready
    } finally {
      set({ isLoading: false });
    }
  },

  saveCurrentSession: async (name: string) => {
    try {
      await chrome.runtime.sendMessage({ action: "SAVE_SESSION", name });
      // Reload the list after saving
      const response = await chrome.runtime.sendMessage({ action: "LIST_SESSIONS" });
      if (response?.success && response.data?.sessions) {
        set({ sessions: response.data.sessions as SessionListItem[] });
      }
    } catch {
      // ignore
    }
  },

  restoreSession: async (id: string, mode: "replace" | "add") => {
    try {
      await chrome.runtime.sendMessage({ action: "RESTORE_SESSION", id, mode });
    } catch {
      // ignore
    }
  },

  deleteSession: async (id: string) => {
    try {
      await chrome.runtime.sendMessage({ action: "DELETE_SESSION", id });
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== id),
      }));
    } catch {
      // ignore
    }
  },
}));
