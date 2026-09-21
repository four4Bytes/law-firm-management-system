"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { TableFilter, type FilterDefinition } from "@/components/ui/TableFilter/TableFilter";
import type { FilterValues } from "@/lib/types";

const statusFilters: FilterDefinition[] = [
  {
    key: "status",
    label: "Status",
    options: [
      { value: "Open", label: "Open" },
      { value: "Closed", label: "Closed" },
      { value: "Settled", label: "Settled" },
      { value: "Terminated", label: "Terminated" },
    ],
  },
];

const multiFilters: FilterDefinition[] = [
  ...statusFilters,
  {
    key: "type",
    label: "Type",
    options: [
      { value: "Civil", label: "Civil" },
      { value: "Criminal", label: "Criminal" },
    ],
  },
];

function TableFilterWithState({
  filters,
  initialValues = {},
}: {
  filters: FilterDefinition[];
  initialValues?: FilterValues;
}) {
  const [values, setValues] = useState<FilterValues>(initialValues);
  return (
    <TableFilter
      filters={filters}
      values={values}
      onChange={setValues}
      onClear={() => setValues({})}
    />
  );
}

const meta: Meta<typeof TableFilterWithState> = {
  component: TableFilterWithState,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { filters: statusFilters },
};

export const WithSelection: Story = {
  args: { filters: statusFilters, initialValues: { status: ["Open", "Settled"] } },
};

export const MultipleFacets: Story = {
  args: { filters: multiFilters, initialValues: { status: ["Open"] } },
};
