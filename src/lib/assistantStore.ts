import { useSyncExternalStore } from "react";

/**
 * Whether the chat assistant is open, shared by everything that can open it:
 * the floating launcher on larger screens and the "Ask" slot in the phone's
 * bottom bar. Module state behind useSyncExternalStore, like useTheme, so the
 * two stay in step without a context provider. Closed on the server.
 */
let open = false;
const listeners = new Set<() => void>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function setAssistantOpen(next: boolean | ((current: boolean) => boolean)): void {
  const value = typeof next === "function" ? next(open) : next;
  if (value === open) return;
  open = value;
  for (const fn of listeners) fn();
}

export function useAssistantOpen(): [boolean, typeof setAssistantOpen] {
  const value = useSyncExternalStore(
    subscribe,
    () => open,
    () => false,
  );
  // Module-level, so it is already stable across renders.
  return [value, setAssistantOpen];
}
