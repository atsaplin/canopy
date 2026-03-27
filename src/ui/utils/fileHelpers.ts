import type { SessionData } from "@core/types";
import { deserializeSession } from "@core/SessionSerializer";

/** Export a session as a .json file download. */
export function exportSessionAsFile(session: SessionData): void {
  const json = JSON.stringify(session, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${session.name.replace(/[^a-zA-Z0-9-_ ]/g, "")}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Import a session from a .json file. Returns the parsed SessionData or null. */
export function importSessionFromFile(): Promise<SessionData | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    let resolved = false;
    input.onchange = async () => {
      resolved = true;
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        const text = await file.text();
        const session = deserializeSession(text);
        resolve(session);
      } catch {
        resolve(null);
      }
    };
    // Handle cancel: when focus returns to window without a file selected
    window.addEventListener("focus", () => {
      setTimeout(() => {
        if (!resolved) resolve(null);
      }, 300);
    }, { once: true });
    input.click();
  });
}
