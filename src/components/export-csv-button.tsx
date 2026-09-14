"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ExportCsvButton({
  filename,
  csv,
  label = "Exportar CSV",
  disabled,
}: {
  filename: string;
  csv: string;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={() => downloadCsv(filename, csv)}
    >
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}
