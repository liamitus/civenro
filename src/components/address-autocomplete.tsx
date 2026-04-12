"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Suggestion {
  label: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Enter your US street address",
  className = "",
  autoFocus = false,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle");
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const abortRef = useRef<AbortController>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setPhase("idle");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(
        `/api/address/autocomplete?q=${encodeURIComponent(query)}`,
        { signal: controller.signal },
      );
      if (!res.ok) return;
      const data: Suggestion[] = await res.json();
      setSuggestions(data);
      setPhase("done");
      setActiveIndex(-1);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setDismissed(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.trim().length >= 3) {
      // Only show shimmer if we don't already have suggestions visible.
      // This prevents flicker when typing more chars with results on screen.
      if (suggestions.length === 0) {
        setPhase("loading");
      }
      debounceRef.current = setTimeout(() => fetchSuggestions(val), 250);
    } else {
      setPhase("idle");
      setSuggestions([]);
    }
  };

  const handleSelect = (suggestion: Suggestion) => {
    onChange(suggestion.label);
    onSelect(suggestion.label);
    setSuggestions([]);
    setDismissed(true);
    setPhase("idle");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setDismissed(true);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setDismissed(true);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const showDropdown =
    !dismissed && phase !== "idle" && (phase === "loading" || suggestions.length > 0 || phase === "done");

  return (
    <div ref={containerRef} className="relative">
      <input
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setDismissed(false);
        }}
        placeholder={placeholder}
        className={className}
        autoFocus={autoFocus}
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? `address-option-${activeIndex}` : undefined
        }
      />
      {showDropdown && (
        <ul
          role="listbox"
          className="absolute z-50 top-[calc(100%+6px)] left-0 right-0 bg-white border border-border/80 rounded-xl shadow-xl overflow-hidden py-1"
        >
          {phase === "loading" && suggestions.length === 0 ? (
            [0, 1, 2].map((i) => (
              <li key={i} className="px-4 py-3" role="presentation">
                <div
                  className="h-4 bg-muted/60 rounded-md animate-pulse"
                  style={{ width: `${75 - i * 15}%` }}
                />
              </li>
            ))
          ) : suggestions.length > 0 ? (
            suggestions.map((s, i) => (
              <li
                key={i}
                id={`address-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={() => handleSelect(s)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex items-center gap-3 px-4 py-3 text-sm cursor-pointer transition-colors ${
                  i === activeIndex
                    ? "bg-navy/[0.06]"
                    : "hover:bg-muted/40"
                }`}
              >
                <svg
                  className="w-4 h-4 text-navy/30 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="text-foreground">{s.label}</span>
              </li>
            ))
          ) : (
            <li className="px-4 py-3 text-sm text-muted-foreground">
              No addresses found — try adding more detail
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
