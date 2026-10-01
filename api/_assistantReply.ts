// The streaming reply shared by the two real-visitor chats: the site assistant
// (/api/assistant) and the ministry assistant (/api/ministry-assistant). Both
// widgets pin WhatsApp above the composer, so both failure messages can point
// there.
import { aiErrorDetail, logAiError } from "./_shared";

/**
 * What to say when the model call fails after the response has been committed.
 *
 * A streaming endpoint answers 200 before the model has produced anything, so
 * a provider failure arrives too late to become a status code — the stream
 * just ends empty and the widget can only manage "the AI didn't respond",
 * which tells the visitor nothing and the owner less. These map the provider's
 * status onto something a visitor can act on, while the real detail goes to
 * the server log. Deliberately vague about the vendor, specific about what the
 * visitor should do next.
 */
export function failureMessage(err: unknown): string {
  const status = Number(aiErrorDetail(err).status);
  if (status === 429) {
    return "I'm getting more questions than I can keep up with right now. Try again in a minute — or use WhatsApp below and you'll get a real reply.";
  }
  if (status === 401 || status === 403) {
    return "I can't reach my model right now, and it's a configuration problem on our side rather than anything you did. WhatsApp below gets you a real reply in the meantime.";
  }
  if (status === 404) {
    return "I can't reach my model right now — it looks like it's been retired or renamed, which is ours to fix. WhatsApp below gets you a real reply in the meantime.";
  }
  if (status === 413 || status === 422) {
    return "That question needed more context than I can hold at once. Try asking it more specifically, or use WhatsApp below.";
  }
  if (status === 400) {
    // Almost always a parameter this model won't take, not anything the
    // visitor did — say so plainly rather than blaming their question.
    return "My model rejected that request, which is a fault on our side rather than anything you asked. WhatsApp below gets you a real reply in the meantime.";
  }
  return "Something went wrong reaching my model. Try again in a moment, or use WhatsApp below for a real reply.";
}

/**
 * Stream the model's answer to the browser as plain text.
 *
 * `failed` reads the error the caller's `onError` captured: the response is
 * already committed by the time it fires, so the error has to travel out
 * through the stream body. An empty 200 is the one outcome nobody can debug,
 * so a reply that produced nothing says what happened instead.
 */
export function streamReply(
  textStream: AsyncIterable<string>,
  failed: () => unknown,
  where: string,
  extraHeaders: Record<string, string> = {},
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let sent = 0;
      let thrown: unknown = null;
      try {
        for await (const delta of textStream) {
          sent += delta.length;
          controller.enqueue(encoder.encode(delta));
        }
      } catch (err) {
        // The SDK routes most failures to onError and ends the stream, but a
        // throw here is still possible. Log only if onError didn't already.
        if (!failed()) {
          thrown = err;
          logAiError(where, err);
        }
      }
      if (sent === 0) controller.enqueue(encoder.encode(failureMessage(failed() ?? thrown)));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", ...extraHeaders },
  });
}
