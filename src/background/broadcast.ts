import type { DomainEvent } from "@shared/types/events";

/** Broadcast a domain event to all extension contexts. */
export function broadcast(event: DomainEvent): void {
  chrome.runtime.sendMessage(event).catch(() => {
    // No receivers — popup/sidepanel may not be open
  });
}
