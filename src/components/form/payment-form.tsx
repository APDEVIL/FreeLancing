"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

// ─────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────

const paymentSchema = z.object({
  toUserId:    z.string({ message: "Select a recipient" }).min(1, "Select a recipient"),
  amount:      z.coerce
                 .number({ message: "Enter a valid amount" })
                 .positive("Amount must be positive"),
  taxPercent:  z.coerce
                 .number()
                 .min(0, "Cannot be negative")
                 .max(100, "Cannot exceed 100")
                 .default(0),
  description: z.string().optional(),
  dueDate:     z.date({ message: "Pick a due date" }),
  notes:       z.string().max(500).optional(),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface PaymentFormProps {
  projectId:  string;
  /** Freelancers / project members eligible to receive payment */
  recipients: { id: string; name: string; email: string }[];
  onSuccess?: (paymentId: string) => void;
  onCancel?:  () => void;
}

// ─────────────────────────────────────────────
// Live total helper
// ─────────────────────────────────────────────

function LiveTotal({ amount, taxPercent }: { amount: number; taxPercent: number }) {
  const tax   = amount * (taxPercent / 100);
  const total = amount + tax;
  if (!amount || isNaN(amount)) return null;
  return (
    <div
      className="flex items-center justify-between rounded-lg px-4 py-3 text-sm"
      style={{ background: "hsl(var(--accent))", border: "1px solid hsl(var(--primary) / 0.15)" }}
    >
      <span style={{ color: "hsl(var(--muted-foreground))" }}>
        ${amount.toFixed(2)} + ${tax.toFixed(2)} tax
      </span>
      <span className="font-bold" style={{ color: "hsl(var(--primary))" }}>
        Total: ${total.toFixed(2)}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function PaymentForm({
  projectId,
  recipients,
  onSuccess,
  onCancel,
}: PaymentFormProps) {
  const utils = api.useUtils();

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema) as any,
    defaultValues: {
      toUserId:    "",
      amount:      undefined,
      taxPercent:  0,
      description: "",
      dueDate:     undefined,
      notes:       "",
    },
  });

  const watchedAmount     = form.watch("amount");
  const watchedTaxPercent = form.watch("taxPercent");

  const mutation = api.payment.create.useMutation({
    onSuccess: async (data) => {
      await utils.payment.list.invalidate({ projectId });
      toast.success(`Payment created. Invoice ${data.invoiceNumber} generated.`);
      form.reset();
      onSuccess?.(data.paymentId);
    },
    onError: (e) => toast.error(e.message),
  });

  const onSubmit = (v: PaymentFormValues) => {
    mutation.mutate({ projectId, ...v });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

        {/* Recipient */}
        <FormField control={form.control} name="toUserId" render={({ field }) => (
          <FormItem>
            <FormLabel>Pay To</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select freelancer" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {recipients.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    No freelancers in this project.
                  </p>
                ) : (
                  recipients.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      <span className="font-medium">{r.name}</span>
                      <span className="ml-2 text-muted-foreground text-xs">{r.email}</span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        {/* Amount + Tax */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="amount" render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (USD)</FormLabel>
              <FormControl>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                    style={{ color: "hsl(var(--muted-foreground))" }}
                  >$</span>
                  <Input
                    type="number" min={0} step="0.01" placeholder="1000.00"
                    className="pl-7"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="taxPercent" render={({ field }) => (
            <FormItem>
              <FormLabel>Tax (%)</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="number" min={0} max={100} step="0.1" placeholder="0"
                    className="pr-8"
                    {...field}
                    value={field.value ?? 0}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                  <span
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
                    style={{ color: "hsl(var(--muted-foreground))" }}
                  >%</span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Live total preview */}
        <LiveTotal amount={watchedAmount} taxPercent={watchedTaxPercent ?? 0} />

        {/* Description */}
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>
              Description
              <span className="ml-1 text-xs font-normal" style={{ color: "hsl(var(--muted-foreground))" }}>
                (optional)
              </span>
            </FormLabel>
            <FormControl>
              <Input placeholder="e.g. Milestone 1 — homepage design" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Due date */}
        <FormField control={form.control} name="dueDate" render={({ field }) => (
          <FormItem>
            <FormLabel>Invoice Due Date</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !field.value && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    {field.value ? format(field.value, "MMM d, yyyy") : "Pick a date"}
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  disabled={(d) => d < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <FormDescription className="text-xs">
              This date appears on the auto-generated invoice.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )} />

        {/* Notes */}
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>
              Invoice Notes
              <span className="ml-1 text-xs font-normal" style={{ color: "hsl(var(--muted-foreground))" }}>
                (optional)
              </span>
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder="Any additional notes to appear on the invoice…"
                rows={2}
                className="resize-none"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" disabled={mutation.isPending} className="gap-2">
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Payment
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={mutation.isPending}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}