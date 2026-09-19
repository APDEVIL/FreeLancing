"use client";

import { Search, X } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  value:       string;
  onChange:    (value: string) => void;
  placeholder?: string;
  className?:   string;
  /** Width class — defaults to "w-56" */
  width?:       string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  width = "w-56",
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("relative flex items-center", width, className)}>
      <Search
        className="absolute left-3 w-3.5 h-3.5 pointer-events-none shrink-0"
        style={{ color: "hsl(var(--muted-foreground))" }}
      />
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "pl-8 h-9 text-sm pr-8",
          "bg-[hsl(var(--secondary))] border-transparent",
          "focus-visible:bg-white focus-visible:border-[hsl(var(--border))]",
          "transition-colors duration-150",
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="absolute right-2.5 p-0.5 rounded transition-colors hover:bg-[hsl(var(--border))]"
          style={{ color: "hsl(var(--muted-foreground))" }}
          aria-label="Clear search"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}