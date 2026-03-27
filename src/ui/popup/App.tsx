import { useChromeEvents } from "@ui/hooks/useChromeEvents";
import { CommandPalette } from "@ui/components/CommandPalette/CommandPalette";

export function PopupApp() {
  useChromeEvents();

  return (
    <div className="w-[400px] h-[500px] flex flex-col bg-[var(--color-bg)] text-[var(--color-fg)]">
      <CommandPalette />
    </div>
  );
}
