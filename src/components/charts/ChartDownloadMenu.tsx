import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileDown, ImageDown, Loader2 } from "lucide-react";
import { exportCsv, exportElementAsPng } from "@/lib/export";

interface ChartDownloadMenuProps {
  fileNameBase: string;
  chartRef: React.RefObject<HTMLElement | null>;
  csvRows: (string | number | null | undefined)[][];
  label?: string;
}

export function ChartDownloadMenu({
  fileNameBase,
  chartRef,
  csvRows,
  label = "Download",
}: ChartDownloadMenuProps) {
  const [pngBusy, setPngBusy] = useState(false);
  const [csvBusy, setCsvBusy] = useState(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs"> <Download className="h-3.5 w-3.5" /> {label} </Button>} />
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Export</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pngBusy}
          onClick={() => {
            if (pngBusy) return;
            setPngBusy(true);
            void exportElementAsPng(chartRef.current, fileNameBase)
              .catch(() => undefined)
              .finally(() => setPngBusy(false));
          }}
        >
          {pngBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageDown className="h-4 w-4" />}
          Chart as PNG
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={csvBusy}
          onClick={() => {
            if (csvBusy) return;
            setCsvBusy(true);
            setTimeout(() => {
              exportCsv(fileNameBase, csvRows);
              setCsvBusy(false);
            }, 0);
          }}
        >
          {csvBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Table as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}