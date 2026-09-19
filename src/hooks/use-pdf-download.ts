"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { downloadBase64Pdf } from "@/lib/utils";

interface UsePdfDownloadOptions {
  /** Called to fetch the PDF — must return { pdf: string; filename: string } */
  fetcher: () => Promise<{ pdf: string; filename: string } | undefined>;
  /** Optional override for the toast success message */
  successMessage?: string;
}

/**
 * Encapsulates the full PDF download flow:
 * 1. Calls the tRPC mutation / fetcher
 * 2. Decodes base64 → Blob → triggers browser download
 * 3. Shows sonner toasts for loading / success / error states
 *
 * Usage:
 *   const { download, isDownloading } = usePdfDownload({
 *     fetcher: () => api.payment.downloadInvoice.mutateAsync({ paymentId }),
 *   });
 */
export function usePdfDownload({
  fetcher,
  successMessage = "PDF downloaded successfully.",
}: UsePdfDownloadOptions) {
  const [isDownloading, setIsDownloading] = useState(false);

  const download = useCallback(async () => {
    if (isDownloading) return;

    setIsDownloading(true);
    const toastId = toast.loading("Generating PDF…");

    try {
      const result = await fetcher();

      if (!result?.pdf) {
        throw new Error("No PDF data returned.");
      }

      downloadBase64Pdf(result.pdf, result.filename);

      toast.success(successMessage, { id: toastId });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to download PDF.";
      toast.error(message, { id: toastId });
    } finally {
      setIsDownloading(false);
    }
  }, [fetcher, isDownloading, successMessage]);

  return { download, isDownloading };
}