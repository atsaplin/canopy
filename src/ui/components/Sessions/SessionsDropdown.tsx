import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSessionStore } from "@ui/stores/sessionStore";
import { SaveSessionDialog } from "./SaveSessionDialog";
import { exportSessionAsFile, importSessionFromFile } from "@ui/utils/fileHelpers";

function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function SessionsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaveOpen, setIsSaveOpen] = useState(false);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const sessions = useSessionStore((s) => s.sessions);
  const loadSessions = useSessionStore((s) => s.loadSessions);
  const restoreSession = useSessionStore((s) => s.restoreSession);
  const deleteSession = useSessionStore((s) => s.deleteSession);

  // Load sessions when dropdown opens
  useEffect(() => {
    if (isOpen) loadSessions();
  }, [isOpen, loadSessions]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setRestoreId(null);
        setDeleteId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const handleRestore = async (id: string, mode: "replace" | "add") => {
    await restoreSession(id, mode);
    setIsOpen(false);
    setRestoreId(null);
  };

  const handleDelete = async (id: string) => {
    await deleteSession(id);
    setDeleteId(null);
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-1.5 py-0.5 text-[12px] text-[var(--color-muted)]
          hover:text-[var(--color-fg)] hover:bg-[var(--color-hover)] rounded transition-colors"
        title="Sessions"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
      </button>

      {/* Save button */}
      <button
        data-save-session
        onClick={() => setIsSaveOpen(true)}
        className="flex items-center px-1.5 py-0.5 text-[12px] text-[var(--color-muted)]
          hover:text-[var(--color-fg)] hover:bg-[var(--color-hover)] rounded transition-colors"
        title="Save session"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] w-[280px] max-h-[400px] overflow-y-auto rounded-lg shadow-xl
              border border-[var(--color-border)] py-1"
            style={{
              backgroundColor: "var(--color-bg)",
              top: (buttonRef.current?.getBoundingClientRect().bottom ?? 0) + 4,
              right: 4,
            }}
          >
            {sessions.length === 0 ? (
              <div className="px-3 py-4 text-center text-[13px] text-[var(--color-muted)]">
                No saved sessions
              </div>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="px-2 py-1">
                  {restoreId === session.id ? (
                    // Restore options
                    <div className="flex flex-col gap-1 p-2 rounded bg-[var(--color-bg-secondary)]">
                      <span className="text-[12px] text-[var(--color-muted)]">Restore "{session.name}"</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleRestore(session.id, "replace")}
                          className="flex-1 px-2 py-1 text-[12px] rounded bg-[var(--color-accent)] text-white
                            hover:bg-[var(--color-accent-hover)] transition-colors"
                        >
                          Replace tabs
                        </button>
                        <button
                          onClick={() => handleRestore(session.id, "add")}
                          className="flex-1 px-2 py-1 text-[12px] rounded border border-[var(--color-border)]
                            text-[var(--color-fg)] hover:bg-[var(--color-hover)] transition-colors"
                        >
                          Add to current
                        </button>
                      </div>
                      <button
                        onClick={() => setRestoreId(null)}
                        className="text-[11px] text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : deleteId === session.id ? (
                    // Delete confirmation
                    <div className="flex flex-col gap-1 p-2 rounded bg-[var(--color-bg-secondary)]">
                      <span className="text-[12px] text-[var(--color-muted)]">Delete "{session.name}"?</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDelete(session.id)}
                          className="flex-1 px-2 py-1 text-[12px] rounded bg-red-500 text-white
                            hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setDeleteId(null)}
                          className="flex-1 px-2 py-1 text-[12px] rounded border border-[var(--color-border)]
                            text-[var(--color-fg)] hover:bg-[var(--color-hover)] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Session item
                    <div
                      className="flex items-center gap-2 px-1 py-1.5 rounded cursor-pointer
                        hover:bg-[var(--color-hover)] transition-colors group"
                      onClick={() => setRestoreId(session.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-[var(--color-fg)] truncate">{session.name}</div>
                        <div className="text-[11px] text-[var(--color-muted)]">
                          {formatRelativeDate(session.savedAt)} · {session.nodeCount} tabs
                        </div>
                      </div>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const response = await chrome.runtime.sendMessage({ action: "GET_SESSION", id: session.id });
                          if (response?.success && response.data?.session) {
                            exportSessionAsFile(response.data.session);
                          }
                        }}
                        className="w-5 h-5 flex items-center justify-center text-[var(--color-muted)]
                          opacity-0 group-hover:opacity-100 hover:text-[var(--color-accent)] transition-all"
                        title="Export as .json"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(session.id);
                        }}
                        className="w-5 h-5 flex items-center justify-center text-[var(--color-muted)]
                          opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
                        title="Delete session"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* Export/Import buttons */}
            <div className="border-t border-[var(--color-border)] mt-1 pt-1 px-2 flex gap-1">
              <button
                onClick={async () => {
                  const session = await importSessionFromFile();
                  if (session) {
                    await chrome.runtime.sendMessage({ action: "IMPORT_SESSION", session });
                    loadSessions();
                  }
                }}
                className="flex-1 px-2 py-1 text-[11px] rounded border border-[var(--color-border)]
                  text-[var(--color-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-hover)]
                  transition-colors text-center"
              >
                Import .json
              </button>
            </div>
          </div>,
          document.body,
        )}

      <SaveSessionDialog isOpen={isSaveOpen} onClose={() => setIsSaveOpen(false)} />
    </>
  );
}
