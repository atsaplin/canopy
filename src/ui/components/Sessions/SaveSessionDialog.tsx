import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSessionStore } from "@ui/stores/sessionStore";

interface SaveSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SaveSessionDialog({ isOpen, onClose }: SaveSessionDialogProps) {
  const defaultName = `Session ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  const [name, setName] = useState(defaultName);
  const inputRef = useRef<HTMLInputElement>(null);
  const saveCurrentSession = useSessionStore((s) => s.saveCurrentSession);

  useEffect(() => {
    if (isOpen) {
      setName(defaultName);
      setTimeout(() => inputRef.current?.select(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (name.trim()) {
      await saveCurrentSession(name.trim());
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30">
      <div
        className="w-[320px] rounded-lg shadow-xl p-4 border border-[var(--color-border)]"
        style={{ backgroundColor: "var(--color-bg)" }}
      >
        <h3 className="text-[14px] font-medium mb-3 text-[var(--color-fg)]">Save Session</h3>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Session name..."
          className="w-full px-2 py-1.5 text-[13px] rounded border border-[var(--color-border)]
            bg-[var(--color-bg-secondary)] text-[var(--color-fg)] outline-none
            focus:ring-1 focus:ring-[var(--color-accent)]"
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={onClose}
            className="px-3 py-1 text-[13px] text-[var(--color-muted)]
              hover:text-[var(--color-fg)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 text-[13px] rounded
              bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]
              transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
