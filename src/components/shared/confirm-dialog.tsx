"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  title:         string;
  description?:  string;
  /** Label for the confirm button — default "Confirm" */
  confirmLabel?: string;
  /** Label for the cancel button — default "Cancel" */
  cancelLabel?:  string;
  /** Makes the confirm button destructive (red) — default true */
  destructive?:  boolean;
  onConfirm:     () => void;
  /** Disable confirm while an async action is in progress */
  isLoading?:    boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel  = "Cancel",
  destructive  = true,
  onConfirm,
  isLoading    = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault(); // prevent auto-close; let caller decide
              onConfirm();
            }}
            disabled={isLoading}
            className={cn(
              destructive &&
                "bg-[hsl(var(--destructive))] text-white hover:bg-[hsl(var(--destructive)/0.9)] focus-visible:ring-[hsl(var(--destructive)/0.4)]",
            )}
          >
            {isLoading ? "Please wait…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}