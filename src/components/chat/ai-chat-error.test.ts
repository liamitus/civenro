import { describe, it, expect } from "vitest";
import { mapErrorToState } from "./ai-chat-error";

describe("mapErrorToState", () => {
  it("classifies client-side abort as a retryable timeout", () => {
    const state = mapErrorToState({ isAbort: true });
    expect(state.retryable).toBe(true);
    expect(state.title.toLowerCase()).toContain("too long");
  });

  it("classifies network errors as retryable", () => {
    const state = mapErrorToState({ isNetworkError: true });
    expect(state.retryable).toBe(true);
    expect(state.title.toLowerCase()).toContain("can't reach");
  });

  it("treats abort as timeout even when isNetworkError is also true", () => {
    // Abort wins — it's a more specific signal than a generic network error.
    const state = mapErrorToState({ isAbort: true, isNetworkError: true });
    expect(state.title.toLowerCase()).toContain("too long");
  });

  it.each([504, 502])(
    "maps %i to a retryable server-timeout message",
    (status) => {
      const state = mapErrorToState({ status });
      expect(state.retryable).toBe(true);
      expect(state.title.toLowerCase()).toContain("too long");
    },
  );

  it("maps 500 to a retryable generic error", () => {
    const state = mapErrorToState({ status: 500 });
    expect(state.retryable).toBe(true);
  });

  it("maps 429 to a retryable rate-limit message and surfaces server copy", () => {
    const state = mapErrorToState({
      status: 429,
      serverMessage: "Limit is 20/hour",
    });
    expect(state.retryable).toBe(true);
    expect(state.detail).toBe("Limit is 20/hour");
  });

  it.each([401, 403])("maps %i to a non-retryable auth error", (status) => {
    const state = mapErrorToState({ status });
    expect(state.retryable).toBe(false);
  });

  it("maps 400 to a non-retryable validation error", () => {
    const state = mapErrorToState({
      status: 400,
      serverMessage: "Message too long",
    });
    expect(state.retryable).toBe(false);
    expect(state.detail).toBe("Message too long");
  });

  it("treats a JSON parse failure as retryable", () => {
    const state = mapErrorToState({ isParseError: true });
    expect(state.retryable).toBe(true);
    expect(state.title.toLowerCase()).toContain("garbled");
  });

  it("falls back to a retryable generic error when no signal matches", () => {
    const state = mapErrorToState({});
    expect(state.retryable).toBe(true);
  });
});
