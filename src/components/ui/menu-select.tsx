"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import styles from "@/components/ui/menu-select.module.css";
import { cn } from "@/lib/utils";

export type MenuSelectOption = {
  value: string;
  label: string;
};

type Props = {
  value: string;
  options: MenuSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  label?: string;
  leadingIcon?: ReactNode;
  variant?: "pill" | "field" | "icon";
  className?: string;
};

export function MenuSelect({
  value,
  options,
  onChange,
  ariaLabel,
  label,
  leadingIcon,
  variant = "field",
  className,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const selected = options.find((option) => option.value === value) ?? options[0];
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === selected?.value),
  );

  const menuRef = useRef<HTMLDivElement>(null);
  const ignoreClickUntil = useRef(0);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(selectedIndex);
    const openedAt = Date.now();
    const onPointerDown = (event: PointerEvent) => {
      // Ignore the same gesture that opened the menu (common iOS bug).
      if (Date.now() - openedAt < 400) return;
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, selectedIndex]);

  useEffect(() => {
    if (open) menuRef.current?.focus();
  }, [open]);

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(selectedIndex);
    }
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + options.length) % options.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (activeIndex >= 0) choose(options[activeIndex].value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div
      className={cn(styles.root, styles[variant], className)}
      ref={rootRef}
    >
      <button
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className={styles.trigger}
        onClick={() => {
          if (Date.now() < ignoreClickUntil.current) return;
          setOpen((current) => !current);
        }}
        onKeyDown={onTriggerKeyDown}
        onPointerUp={(event) => {
          if (event.pointerType !== "touch") return;
          ignoreClickUntil.current = Date.now() + 500;
          setOpen((current) => !current);
        }}
        type="button"
      >
        {leadingIcon ? (
          <span aria-hidden="true" className={styles.leadingIcon}>
            {leadingIcon}
          </span>
        ) : null}
        {variant !== "icon" && label ? (
          <span className={styles.label}>{label}</span>
        ) : null}
        {variant !== "icon" ? (
          <span className={styles.value}>{selected?.label}</span>
        ) : null}
        {variant !== "icon" ? (
          <span aria-hidden="true" className={styles.chevron}>
            <ChevronDown />
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          className={styles.menu}
          id={listId}
          onKeyDown={onMenuKeyDown}
          ref={menuRef}
          role="listbox"
          tabIndex={-1}
        >
          {options.map((option, index) => {
            const selectedOption = option.value === selected?.value;
            return (
              <button
                aria-selected={selectedOption}
                className={cn(
                  styles.option,
                  selectedOption && styles.optionSelected,
                  index === activeIndex && styles.optionActive,
                )}
                key={option.value}
                onClick={() => {
                  if (Date.now() < ignoreClickUntil.current) return;
                  choose(option.value);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                onPointerUp={(event) => {
                  if (event.pointerType !== "touch") return;
                  ignoreClickUntil.current = Date.now() + 500;
                  choose(option.value);
                }}
                role="option"
                type="button"
              >
                <span>{option.label}</span>
                <Check aria-hidden="true" className={styles.check} />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
