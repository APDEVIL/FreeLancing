"use client";

import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePdfDownload } from "@/hooks/use-pdf-download";

interface PdfDownloadBtnProps {
  /** tRPC mutation/query to call — must return { pdf: string; filename: string } */
  fetcher:         () => Promise<{ pdf: string; filename: string } | undefined>;
  label?:          string;
  successMessage?: string;
  variant?:        "default" | "outline" | "ghost" | "secondary";
  size?:           "default" | "sm" | "lg" | "icon";
  className?:      string;
}

export function PdfDownloadBtn({
  fetcher,
  label           = "Download PDF",
  successMessage,
  variant         = "outline",
  size            = "sm",
  className,
}: PdfDownloadBtnProps) {
  const { download, isDownloading } = usePdfDownload({ fetcher, successMessage });

  return (
    <Button
      variant={variant}
      size={size}
      onClick={download}
      disabled={isDownloading}
      className={cn("gap-2", className)}
    >
      {isDownloading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <FileDown className="w-3.5 h-3.5" />
      )}
      {size !== "icon" && (isDownloading ? "Generating…" : label)}
    </Button>
  );
}