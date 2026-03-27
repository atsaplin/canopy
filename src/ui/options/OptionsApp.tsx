import { useState, useEffect } from "react";
import { useSettingsStore, DEFAULT_SETTINGS, type Settings } from "@ui/stores/settingsStore";
import type { SessionData, SessionNode, SessionListItem } from "@core/types";
import { exportSessionAsFile, importSessionFromFile } from "@ui/utils/fileHelpers";

type TabName = "general" | "hotkeys" | "sessions" | "about";

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString();
}

export function OptionsApp() {
  const [activeTab, setActiveTab] = useState<TabName>("general");
  const settings = useSettingsStore();
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<Record<string, SessionData>>({});
  const [storageUsage, setStorageUsage] = useState("");

  // Load settings on mount
  useEffect(() => {
    settings.loadSettings();
    chrome.storage.local.getBytesInUse(null).then((bytes) => {
      if (bytes < 1024) setStorageUsage(`${bytes} B`);
      else if (bytes < 1024 * 1024) setStorageUsage(`${(bytes / 1024).toFixed(1)} KB`);
      else setStorageUsage(`${(bytes / (1024 * 1024)).toFixed(1)} MB`);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load sessions when tab changes
  useEffect(() => {
    if (activeTab === "sessions") {
      chrome.runtime.sendMessage({ action: "LIST_SESSIONS" }).then((response) => {
        if (response?.success && response.data?.sessions) {
          setSessions(response.data.sessions);
        }
      }).catch(() => {});
    }
  }, [activeTab]);

  const handleReset = async () => {
    await settings.updateSettings(DEFAULT_SETTINGS);
  };

  const updateSetting = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    await settings.updateSettings({ [key]: value });
  };

  const loadSessionData = async (id: string) => {
    if (sessionData[id]) return;
    const response = await chrome.runtime.sendMessage({ action: "GET_SESSION", id });
    if (response?.success && response.data?.session) {
      setSessionData((prev) => ({ ...prev, [id]: response.data.session }));
    }
  };

  const handleExportSession = async (id: string) => {
    const response = await chrome.runtime.sendMessage({ action: "GET_SESSION", id });
    if (response?.success && response.data?.session) {
      exportSessionAsFile(response.data.session);
    }
  };

  const handleExportAll = async () => {
    const allSessions: SessionData[] = [];
    for (const item of sessions) {
      const response = await chrome.runtime.sendMessage({ action: "GET_SESSION", id: item.id });
      if (response?.success) allSessions.push(response.data.session);
    }
    const blob = new Blob([JSON.stringify(allSessions, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `canopy-all-sessions-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const session = await importSessionFromFile();
    if (session) {
      await chrome.runtime.sendMessage({ action: "IMPORT_SESSION", session });
      // Reload sessions list
      const response = await chrome.runtime.sendMessage({ action: "LIST_SESSIONS" });
      if (response?.success) setSessions(response.data.sessions);
    }
  };

  const handleDeleteSession = async (id: string) => {
    await chrome.runtime.sendMessage({ action: "DELETE_SESSION", id });
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setExpandedSession(null);
  };

  const renderSessionTree = (nodes: SessionNode[], depth = 0): React.ReactNode => {
    return nodes.map((node, i) => (
      <div key={`${depth}-${i}`}>
        <div
          className="flex items-center gap-2 py-0.5 text-[13px]"
          style={{ paddingLeft: depth * 16 + 8 }}
        >
          {node.nodes.length > 0 && (
            <span className="text-[10px] text-[var(--color-muted)]">▸</span>
          )}
          {node.group && (
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: node.group.color }}
            />
          )}
          <span className="truncate text-[var(--color-fg)]">{node.title}</span>
          <span className="text-[11px] text-[var(--color-muted)] truncate shrink-0 max-w-[200px]">
            {node.url}
          </span>
        </div>
        {node.nodes.length > 0 && renderSessionTree(node.nodes, depth + 1)}
      </div>
    ));
  };

  const tabs: { id: TabName; label: string }[] = [
    { id: "general", label: "General" },
    { id: "hotkeys", label: "Hotkeys" },
    { id: "sessions", label: "Sessions" },
    { id: "about", label: "About" },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-fg)] flex justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <img src="/public/images/icon-128.png" alt="Canopy" className="w-10 h-10" />
          <div>
            <h1 className="text-xl font-semibold">Canopy</h1>
            <p className="text-[13px] text-[var(--color-muted)]">
              v{chrome.runtime.getManifest().version}
            </p>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-0 border-b border-[var(--color-border)] mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px cursor-pointer bg-transparent
                ${activeTab === tab.id
                  ? "border-green-500 text-[var(--color-fg)]"
                  : "border-transparent text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* General tab */}
        {activeTab === "general" && (
          <div>
            <section className="mb-8">
              <h2 className="text-[15px] font-medium mb-4 pb-2 border-b border-[var(--color-border)]">
                Tree View
              </h2>

              <SettingRow
                label="Indent size"
                description="Pixels of indentation per tree level"
                control={
                  <select
                    value={settings.indentSize}
                    onChange={(e) => updateSetting("indentSize", Number(e.target.value))}
                    className="bg-[var(--color-hover)] border border-[var(--color-border)] rounded px-2 py-1 text-[13px] text-[var(--color-fg)]"
                  >
                    <option value={8}>8px (compact)</option>
                    <option value={16}>16px (default)</option>
                    <option value={24}>24px (spacious)</option>
                  </select>
                }
              />
            </section>

            <section className="mb-8">
              <h2 className="text-[15px] font-medium mb-4 pb-2 border-b border-[var(--color-border)]">
                Tab Decay
              </h2>

              <SettingRow
                label="Show decay indicators"
                description="Dim tabs and show staleness icons based on when you last visited them"
                control={
                  <Toggle checked={settings.showDecayIndicators} onChange={(v) => updateSetting("showDecayIndicators", v)} />
                }
              />
            </section>

            <section className="mb-8">
              <h2 className="text-[15px] font-medium mb-4 pb-2 border-b border-[var(--color-border)]">
                Safety
              </h2>

              <SettingRow
                label="Confirm close tree"
                description='Show a confirmation dialog when using "Close tree" from the context menu'
                control={
                  <Toggle checked={settings.confirmCloseTree} onChange={(v) => updateSetting("confirmCloseTree", v)} />
                }
              />
            </section>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
              <p className="text-[12px] text-[var(--color-muted)]">Settings are saved automatically.</p>
              <button
                onClick={handleReset}
                className="px-4 py-2 text-[13px] rounded-md border border-[var(--color-border)] bg-transparent text-[var(--color-fg)] hover:bg-[var(--color-hover)] transition-colors cursor-pointer"
              >
                Reset to defaults
              </button>
            </div>
          </div>
        )}

        {/* Hotkeys tab */}
        {activeTab === "hotkeys" && (
          <div>
            <p className="text-[13px] text-[var(--color-muted)] mb-6">
              Keyboard shortcuts give you quick access to Canopy features. To change key assignments, go to{" "}
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); chrome.tabs.create({ url: "chrome://extensions/shortcuts" }); }}
                className="text-green-500 hover:underline"
              >
                chrome://extensions/shortcuts
              </a>
            </p>

            <section className="mb-8">
              <h2 className="text-[15px] font-medium mb-4 pb-2 border-b border-[var(--color-border)]">
                Extension Shortcuts
              </h2>
              <p className="text-[12px] text-[var(--color-muted)] mb-4">
                These shortcuts are configurable via Chrome's extension shortcuts page.
              </p>
              <HotkeyRow label="Open side panel" keys="Alt + S" configurable />
              <HotkeyRow label="Focus search" keys="Alt + F" configurable />
              <HotkeyRow label="Copy context for AI" keys="Alt + C" configurable />
              <HotkeyRow label="Save session" keys="Not set" configurable />
            </section>

            <section className="mb-8">
              <h2 className="text-[15px] font-medium mb-4 pb-2 border-b border-[var(--color-border)]">
                Side Panel Navigation
              </h2>
              <p className="text-[12px] text-[var(--color-muted)] mb-4">
                These shortcuts work when the side panel is focused.
              </p>
              <HotkeyRow label="Navigate up/down" keys={["\u2191", "\u2193"]} />
              <HotkeyRow label="Collapse / jump to parent" keys="\u2190" />
              <HotkeyRow label="Expand" keys="\u2192" />
              <HotkeyRow label="Activate tab" keys="Enter" />
              <HotkeyRow label="Close tab" keys="Delete" />
              <HotkeyRow label="Close menu / clear" keys="Escape" />
            </section>

            <section className="mb-8">
              <h2 className="text-[15px] font-medium mb-4 pb-2 border-b border-[var(--color-border)]">
                Selection
              </h2>
              <HotkeyRow label="Range select" keys="Shift + Click" />
              <HotkeyRow label="Toggle select" keys="Ctrl/\u2318 + Click" />
            </section>
          </div>
        )}

        {/* Sessions tab */}
        {activeTab === "sessions" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <p className="text-[13px] text-[var(--color-muted)]">
                {sessions.length} saved session{sessions.length !== 1 ? "s" : ""} &middot; {storageUsage} used
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleImport}
                  className="px-3 py-1.5 text-[12px] rounded-md border border-[var(--color-border)] bg-transparent
                    text-[var(--color-fg)] hover:bg-[var(--color-hover)] transition-colors cursor-pointer"
                >
                  Import .json
                </button>
                <button
                  onClick={handleExportAll}
                  disabled={sessions.length === 0}
                  className="px-3 py-1.5 text-[12px] rounded-md border border-[var(--color-border)] bg-transparent
                    text-[var(--color-fg)] hover:bg-[var(--color-hover)] transition-colors cursor-pointer
                    disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Export all
                </button>
              </div>
            </div>

            {sessions.length === 0 ? (
              <div className="py-12 text-center text-[var(--color-muted)]">
                <p className="text-[15px] mb-2">No saved sessions</p>
                <p className="text-[13px]">Save a session from the side panel to see it here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="border border-[var(--color-border)] rounded-lg overflow-hidden"
                  >
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--color-hover)] transition-colors"
                      onClick={() => {
                        const newId = expandedSession === session.id ? null : session.id;
                        setExpandedSession(newId);
                        if (newId) loadSessionData(newId);
                      }}
                    >
                      <span className="text-[10px] text-[var(--color-muted)]">
                        {expandedSession === session.id ? "▼" : "▶"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-medium truncate">{session.name}</div>
                        <div className="text-[12px] text-[var(--color-muted)]">
                          {formatDate(session.savedAt)} &middot; {session.nodeCount} tab{session.nodeCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleExportSession(session.id); }}
                          className="px-2 py-1 text-[11px] rounded border border-[var(--color-border)]
                            text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-hover)]
                            transition-colors cursor-pointer bg-transparent"
                        >
                          Export
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete "${session.name}"?`)) handleDeleteSession(session.id);
                          }}
                          className="px-2 py-1 text-[11px] rounded border border-red-500/30
                            text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer bg-transparent"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {expandedSession === session.id && (
                      <div className="border-t border-[var(--color-border)] bg-[var(--color-hover)] px-2 py-2 max-h-[300px] overflow-y-auto">
                        {sessionData[session.id] ? (
                          sessionData[session.id].nodes.length > 0 ? (
                            renderSessionTree(sessionData[session.id].nodes)
                          ) : (
                            <p className="text-[12px] text-[var(--color-muted)] px-2 py-2">Empty session</p>
                          )
                        ) : (
                          <p className="text-[12px] text-[var(--color-muted)] px-2 py-2">Loading...</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* About tab */}
        {activeTab === "about" && (
          <div>
            <section className="mb-8">
              <div className="flex items-center gap-4 mb-6">
                <img src="/public/images/icon-128.png" alt="Canopy" className="w-16 h-16" />
                <div>
                  <h2 className="text-lg font-semibold">Canopy — Tree Style Tabs</h2>
                  <p className="text-[13px] text-[var(--color-muted)]">
                    Version {chrome.runtime.getManifest().version}
                  </p>
                </div>
              </div>

              <p className="text-[13px] text-[var(--color-muted)] mb-6 leading-relaxed">
                A tree-style tab viewer for Chrome with drag-and-drop hierarchy, session save/restore,
                AI context export, and tab decay visualization. All data stays local — no tracking, no analytics.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-[15px] font-medium mb-4 pb-2 border-b border-[var(--color-border)]">
                Links
              </h2>
              <div className="space-y-3">
                <a
                  href="https://github.com/atsaplin/canopy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[var(--color-border)]
                    hover:bg-[var(--color-hover)] transition-colors no-underline"
                >
                  <svg className="w-5 h-5 text-[var(--color-fg)]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58 0-.28-.01-1.04-.02-2.04-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.02 0c2.3-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.22.7.82.58A12.01 12.01 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  <div>
                    <div className="text-[13px] font-medium text-[var(--color-fg)]">GitHub</div>
                    <div className="text-[12px] text-[var(--color-muted)]">Source code, issues, and documentation</div>
                  </div>
                </a>
                <a
                  href="https://github.com/atsaplin/canopy/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[var(--color-border)]
                    hover:bg-[var(--color-hover)] transition-colors no-underline"
                >
                  <svg className="w-5 h-5 text-[var(--color-fg)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" />
                  </svg>
                  <div>
                    <div className="text-[13px] font-medium text-[var(--color-fg)]">Report a Bug</div>
                    <div className="text-[12px] text-[var(--color-muted)]">Found something broken? Let us know</div>
                  </div>
                </a>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-[15px] font-medium mb-4 pb-2 border-b border-[var(--color-border)]">
                Privacy
              </h2>
              <p className="text-[13px] text-[var(--color-muted)] leading-relaxed">
                All data is stored locally in your browser using <code className="text-[12px] px-1 py-0.5 rounded bg-[var(--color-hover)]">chrome.storage.local</code>.
                Canopy makes no network requests, has no analytics, and does not collect any data.
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingRow({ label, description, control }: { label: string; description: string; control: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="pr-4">
        <div className="text-[13px] text-[var(--color-fg)]">{label}</div>
        <div className="text-[12px] text-[var(--color-muted)]">{description}</div>
      </div>
      {control}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer border-none shrink-0
        ${checked ? "bg-green-600" : "bg-[var(--color-border)]"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform
          ${checked ? "translate-x-4" : ""}`}
      />
    </button>
  );
}

function HotkeyRow({ label, keys, configurable }: { label: string; keys: string | string[]; configurable?: boolean }) {
  const keyArray = Array.isArray(keys) ? keys : [keys];
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)] last:border-b-0">
      <div className="flex items-center gap-2">
        <span className="text-[14px] text-[var(--color-fg)]">{label}</span>
        {configurable && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-hover)] text-[var(--color-muted)]">
            configurable
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {keyArray.map((key) => (
          <kbd
            key={key}
            className="text-[13px] px-2 py-1 rounded-md bg-[var(--color-hover)] border border-[var(--color-border)]
              text-[var(--color-fg)] font-mono min-w-[32px] text-center"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  );
}
