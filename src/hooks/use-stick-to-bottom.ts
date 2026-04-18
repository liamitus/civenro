"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Distance (px) from the bottom inside which we consider the user "pinned".
 * Small enough that scrolling away by a line or two breaks the pin, large
 * enough to tolerate sub-pixel rounding and bounce on iOS momentum scrolls.
 */
const PIN_THRESHOLD_PX = 48;

/**
 * Keep a scroll container anchored to the bottom as content grows — but only
 * while the user hasn't scrolled away. This is the pattern used by ChatGPT,
 * Claude.ai, and Perplexity for streaming AI responses: auto-follow tokens
 * when the user is at the bottom, stop following the moment they scroll up
 * to read, and resume when they scroll back down.
 *
 * Usage:
 *
 *   const { containerRef, contentRef, isPinned, scrollToBottom } =
 *     useStickToBottom();
 *
 *   <div ref={containerRef} className="overflow-y-auto">
 *     <div ref={contentRef}>{messages}</div>
 *   </div>
 *
 * Call `scrollToBottom()` on user send to force-pin regardless of current
 * scroll position — they just submitted, they want to see the response.
 *
 * Uses callback refs rather than `useRef` + `useEffect` because the scroll
 * container is often rendered inside a conditionally-mounted wrapper (e.g. a
 * Dialog/Sheet that mounts its content only when open). A mount-time
 * `useEffect` on empty deps would run with `ref.current === null` and never
 * re-run when the element later attaches. Callback refs fire on every
 * attach/detach, so listeners always get wired up when (and only when) the
 * DOM element is in the tree.
 */
export function useStickToBottom() {
  const [isPinned, setIsPinned] = useState(true);
  const isPinnedRef = useRef(true);

  const containerNodeRef = useRef<HTMLDivElement | null>(null);
  const contentNodeRef = useRef<HTMLDivElement | null>(null);
  const scrollCleanupRef = useRef<(() => void) | null>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  const updatePinnedFromScroll = useCallback((el: HTMLElement) => {
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const pinned = distance < PIN_THRESHOLD_PX;
    if (pinned !== isPinnedRef.current) {
      isPinnedRef.current = pinned;
      setIsPinned(pinned);
    }
  }, []);

  // Wire (or rewire) the ResizeObserver once both container and content are
  // attached. Called from whichever callback ref runs last during mount.
  const wireResizeObserver = useCallback(() => {
    resizeCleanupRef.current?.();
    resizeCleanupRef.current = null;

    const container = containerNodeRef.current;
    const content = contentNodeRef.current;
    if (!container || !content) return;

    const follow = () => {
      if (!isPinnedRef.current) return;
      // `instant` avoids smooth-scroll jitter when tokens arrive in quick
      // succession — at 30ms intervals the animation queue never catches up
      // and the view stutters. Snapping is visually seamless when the
      // deltas are small.
      container.scrollTo({ top: container.scrollHeight, behavior: "instant" });
    };

    const observer = new ResizeObserver(follow);
    observer.observe(content);
    // Fire once synchronously so pre-hydrated history lands at the bottom.
    follow();

    resizeCleanupRef.current = () => observer.disconnect();
  }, []);

  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      scrollCleanupRef.current?.();
      scrollCleanupRef.current = null;
      containerNodeRef.current = node;

      if (node) {
        const onScroll = () => updatePinnedFromScroll(node);
        node.addEventListener("scroll", onScroll, { passive: true });
        scrollCleanupRef.current = () =>
          node.removeEventListener("scroll", onScroll);
      }

      wireResizeObserver();
    },
    [updatePinnedFromScroll, wireResizeObserver],
  );

  const contentRef = useCallback(
    (node: HTMLDivElement | null) => {
      contentNodeRef.current = node;
      wireResizeObserver();
    },
    [wireResizeObserver],
  );

  const scrollToBottom = useCallback(() => {
    const el = containerNodeRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "instant" });
    isPinnedRef.current = true;
    setIsPinned(true);
  }, []);

  return { containerRef, contentRef, isPinned, scrollToBottom };
}
