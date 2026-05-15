export type ExportColumn = {
  key: string;
  label: string;
};

export function buildCsvHeader(columns: ExportColumn[]): string {
  return columns.map((column) => column.label).join(",");
}

export * from "./csv";
export * from "./workspaceCsv";
