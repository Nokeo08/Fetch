import React, { useState, useEffect, useRef, useCallback } from "react";
import type { HistoryEntry } from "./api/sections";
import { itemsApi } from "./api/sections";

interface AutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onSelect: (entry: HistoryEntry) => void;
    onSubmit: () => void;
    placeholder?: string;
}

export function Autocomplete({
    value,
    onChange,
    onSelect,
    onSubmit,
    placeholder = "Add item...",
}: AutocompleteProps) {
    const [suggestions, setSuggestions] = useState<HistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [debouncedValue, setDebouncedValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, 300);
        return () => clearTimeout(timer);
    }, [value]);

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!debouncedValue || debouncedValue.length < 2) {
                setSuggestions([]);
                setIsOpen(false);
                return;
            }

            setIsLoading(true);
            try {
                const res = await itemsApi.getSuggestions(debouncedValue, 5);
                if (res.success && res.data) {
                    const exactMatch = res.data.some(
                        (s) => s.name.toLowerCase() === debouncedValue.toLowerCase()
                    );
                    if (exactMatch) {
                        setSuggestions([]);
                        setIsOpen(false);
                    } else {
                        setSuggestions(res.data);
                        setIsOpen(res.data.length > 0);
                    }
                    setSelectedIndex(-1);
                }
            } catch {
                setSuggestions([]);
                setIsOpen(false);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSuggestions();
    }, [debouncedValue]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (!isOpen || suggestions.length === 0) {
                if (e.key === "Enter") {
                    onSubmit();
                }
                return;
            }

            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setSelectedIndex((prev) =>
                        prev < suggestions.length - 1 ? prev + 1 : 0
                    );
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setSelectedIndex((prev) =>
                        prev > 0 ? prev - 1 : suggestions.length - 1
                    );
                    break;
                case "Enter":
                    e.preventDefault();
                    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                        onSelect(suggestions[selectedIndex]);
                        setIsOpen(false);
                    } else {
                        onSubmit();
                    }
                    break;
                case "Escape":
                    e.preventDefault();
                    setIsOpen(false);
                    setSelectedIndex(-1);
                    break;
            }
        },
        [isOpen, suggestions, selectedIndex, onSelect, onSubmit]
    );

    const handleSelect = (entry: HistoryEntry) => {
        onSelect(entry);
        setIsOpen(false);
        setSelectedIndex(-1);
    };

    const highlightMatch = (text: string, query: string) => {
        if (!query || query.length < 2) return text;

        const lowerText = text.toLowerCase();
        const lowerQuery = query.toLowerCase();

        const exactIndex = lowerText.indexOf(lowerQuery);
        if (exactIndex !== -1) {
            return (
                <>
                    {text.slice(0, exactIndex)}
                    <strong>{text.slice(exactIndex, exactIndex + query.length)}</strong>
                    {text.slice(exactIndex + query.length)}
                </>
            );
        }

        const chars: { char: string; highlight: boolean }[] = [];
        let queryIdx = 0;
        const queryLen = lowerQuery.length;

        for (let i = 0; i < text.length; i++) {
            if (queryIdx < queryLen && lowerText[i] === lowerQuery[queryIdx]) {
                chars.push({ char: text[i], highlight: true });
                queryIdx++;
            } else {
                chars.push({ char: text[i], highlight: false });
            }
        }

        if (queryIdx !== queryLen) return text;

        const parts: (string | React.ReactNode)[] = [];
        let currentPart = "";
        let highlighting = false;

        for (const { char, highlight } of chars) {
            if (highlight && !highlighting) {
                if (currentPart) {
                    parts.push(currentPart);
                    currentPart = "";
                }
                highlighting = true;
            } else if (!highlight && highlighting) {
                parts.push(<strong key={parts.length}>{currentPart}</strong>);
                currentPart = "";
                highlighting = false;
            }
            currentPart += char;
        }

        if (currentPart) {
            if (highlighting) {
                parts.push(<strong key={parts.length}>{currentPart}</strong>);
            } else {
                parts.push(currentPart);
            }
        }

        return <>{parts}</>;
    };

    const formatFrequency = (freq: number): number => {
        if (freq >= 10) return 3;
        if (freq >= 5) return 2;
        if (freq >= 2) return 1;
        return 0;
    };

    return (
        <div className="autocomplete-container">
            <div className="autocomplete-input-wrapper">
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="autocomplete-input"
                />
                {isLoading && <span className="autocomplete-loading" />}
            </div>

            {isOpen && suggestions.length > 0 && (
                <div ref={dropdownRef} className="autocomplete-dropdown">
                    {suggestions.map((suggestion, index) => (
                        <div
                            key={suggestion.id}
                            className={`autocomplete-suggestion ${
                                index === selectedIndex ? "selected" : ""
                            }`}
                            onClick={() => handleSelect(suggestion)}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            <div className="suggestion-main">
                                <span className="suggestion-name">
                                    {highlightMatch(suggestion.name, debouncedValue)}
                                </span>
                                {suggestion.sectionName && (
                                    <span className="suggestion-section">
                                        {suggestion.sectionName}
                                    </span>
                                )}
                            </div>
                            {suggestion.frequency > 1 && (
                                <div className="suggestion-frequency">
                                    {[1, 2, 3].map((level) => (
                                        <span
                                            key={level}
                                            className={`signal-bar ${level <= formatFrequency(suggestion.frequency) ? "active" : ""}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
