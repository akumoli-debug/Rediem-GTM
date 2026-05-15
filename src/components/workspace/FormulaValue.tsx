import type { FormulaCell } from "./types";

export function FormulaValue({ cell }: { cell: FormulaCell }) {
  if (cell.error) {
    return <span className="formula-error">{cell.error}</span>;
  }

  return <span className="formula-value">{cell.value}</span>;
}

