import { useCallback, useRef, useState } from "react";
import { streamDemo } from "../../lib/demoClient";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * The assistant's conversation state.
 *
 * Kept out of the panel so the UI file is layout and the transport is here.
 *
 * `turnsRef` is the source of truth for *reading* the thread; `turns` state
 * exists to render it, and `commit` keeps them in step. That split is not
 * ceremony. A functional `setState` updater does not run when you call it —
 * React runs it during the next render — so building the outgoing request
 * inside one sends whatever the variable held beforehand, which is nothing.
 * That shipped once: every message reached the endpoint with an empty
 * `messages` array and came back "Ask a question to start." Reading the ref
 * is synchronous, so the request always carries the thread that exists now.
 *
 * The rest of the behaviour:
 *
 * - The reply is appended as an empty assistant turn *before* the stream
 *   starts, then filled in place, so tokens appear inside a bubble that is
 *   already on screen instead of one that pops in late.
 * - A send while a reply is streaming aborts the old one first, so an
 *   impatient visitor gets the answer to their newest question rather than two
 *   interleaved streams.
 * - A failed turn removes its own empty bubble and surfaces the endpoint's
 *   message. `/api/assistant` returns real copy for its 429 and 503 cases, so
 *   "you're going too fast" and "the assistant is offline" reach the visitor
 *   rather than a generic failure.
 *
 * Nothing is persisted: no localStorage, no server log. The widget tells
 * visitors chats aren't stored, so it must not quietly keep them.
 */
export function useAssistantChat(endpoint: string, locale: "en" | "ar", fallbackError: string) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const turnsRef = useRef<ChatTurn[]>([]);
  const abort = useRef<AbortController | null>(null);

  /** Write the thread. Always through here, so the ref can never fall behind. */
  const commit = useCallback((next: ChatTurn[]) => {
    turnsRef.current = next;
    setTurns(next);
  }, []);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question) return;

      abort.current?.abort();
      const controller = new AbortController();
      abort.current = controller;

      setError(null);
      setPending(true);

      // What the endpoint should see, read synchronously from the ref, and
      // then the same thread plus the empty bubble the stream will fill.
      const history: ChatTurn[] = [...turnsRef.current, { role: "user", content: question }];
      commit([...history, { role: "assistant", content: "" }]);

      try {
        await streamDemo(
          endpoint,
          { messages: history, locale },
          (full) => {
            const next = [...turnsRef.current];
            const i = next.length - 1;
            if (i >= 0 && next[i].role === "assistant") next[i] = { role: "assistant", content: full };
            commit(next);
          },
          controller.signal,
        );
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : fallbackError);
        // Drop the bubble that never got filled.
        const cur = turnsRef.current;
        const lastTurn = cur[cur.length - 1];
        if (lastTurn && lastTurn.role === "assistant" && !lastTurn.content) commit(cur.slice(0, -1));
      } finally {
        if (!controller.signal.aborted) setPending(false);
      }
    },
    [endpoint, locale, fallbackError, commit],
  );

  const reset = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
    commit([]);
    setError(null);
    setPending(false);
  }, [commit]);

  /** The visitor's most recent question — carried into the WhatsApp handoff. */
  const lastQuestion = [...turns].reverse().find((t) => t.role === "user")?.content;

  return { turns, pending, error, send, reset, lastQuestion };
}
