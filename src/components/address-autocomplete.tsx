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
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const abortRef = useRef<AbortController>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setLoading(false);
      setNoResults(false);
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
      setNoResults(data.length === 0);
      setActiveIndex(-1);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setDismissed(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.trim().length >= 3) {
      setLoading(true);
      setNoResults(false);
      debounceRef.current = setTimeout(() => fetchSuggestions(val), 200);
    } else {
      setLoading(false);
      setSuggestions([]);
      setNoResults(false);
    }
  };

  const handleSelect = (suggestion: Suggestion) => {
    onChange(suggestion.label);
    onSelect(suggestion.label);
    setSuggestions([]);
    setDismissed(true);
    setLoading(false);
    setNoResults(false);
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

  // Close dropdown on outside click
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

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const showDropdown =
    !dismissed && (loading || suggestions.length > 0 || noResults);

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
          className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg overflow-hidden"
        >
          {loading ? (
            [0, 1, 2].map((i) => (
              <li key={i} className="px-4 py-2.5" role="presentation">
                <div
                  className="h-4 bg-muted rounded animate-pulse"
                  style={{ width: `${70 - i * 12}%` }}
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
                className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                  i === activeIndex
                    ? "bg-navy/5 text-navy"
                    : "text-foreground hover:bg-muted/50"
                }`}
              >
                {s.label}
              </li>
            ))
          ) : (
            <li className="px-4 py-2.5 text-sm text-muted-foreground">
              No addresses found — try adding more detail
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
