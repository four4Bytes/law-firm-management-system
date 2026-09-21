"use client";

import clsx from "clsx";
import { Dialog, DialogTrigger, Heading } from "react-aria-components";
import { FaFilter } from "react-icons/fa6";

import { Button } from "@/components/ui/Button/Button";
import { Checkbox } from "@/components/ui/Checkbox/Checkbox";
import { Popover } from "@/components/ui/Popover/Popover";
import { Tooltip, TooltipTrigger } from "@/components/ui/Tooltip/Tooltip";
import type { FilterValues } from "@/lib/types";

import styles from "./TableFilter.module.css";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDefinition {
  key: string;
  label: string;
  options: FilterOption[];
}

export interface TableFilterPayload {
  filters: FilterDefinition[];
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onClear: () => void;
  className?: string;
}

function countSelected(values: FilterValues): number {
  return Object.values(values).reduce((total, selected) => total + selected.length, 0);
}

function toggleValue(values: FilterValues, key: string, value: string): FilterValues {
  const selected = values[key] ?? [];
  const next = selected.includes(value)
    ? selected.filter((item) => item !== value)
    : [...selected, value];
  if (next.length === 0) {
    const nextValues = { ...values };
    delete nextValues[key];
    return nextValues;
  }
  return { ...values, [key]: next };
}

export function TableFilter({ filters, values, onChange, onClear, className }: TableFilterPayload) {
  const activeCount = countSelected(values);

  return (
    <TooltipTrigger>
      <DialogTrigger>
        <Button
          variant="secondary"
          aria-label="Filters"
          className={clsx(styles.filterButton, className)}
        >
          <FaFilter className={styles.icon} />
          {activeCount > 0 && <span className={styles.badge}>{activeCount}</span>}
        </Button>
        <Popover placement="bottom end" width="content" className={styles.popover}>
          <Dialog className={styles.dialog}>
            <div className={styles.header}>
              <Heading slot="title" className={styles.title}>
                Filters
              </Heading>
              {activeCount > 0 && (
                <Button variant="ghost" className={styles.clearButton} onPress={onClear}>
                  Clear
                </Button>
              )}
            </div>
            <div className={styles.sections}>
              {filters.map((filter) => (
                <section key={filter.key} className={styles.section}>
                  <h3 className={styles.sectionTitle}>{filter.label}</h3>
                  <div className={styles.options}>
                    {filter.options.map((option) => (
                      <Checkbox
                        key={option.value}
                        isSelected={(values[filter.key] ?? []).includes(option.value)}
                        onChange={() => onChange(toggleValue(values, filter.key, option.value))}
                      >
                        {option.label}
                      </Checkbox>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </Dialog>
        </Popover>
      </DialogTrigger>
      <Tooltip>Filters</Tooltip>
    </TooltipTrigger>
  );
}
