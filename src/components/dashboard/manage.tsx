"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { spendCategories, spendableAccounts, primaryChecking, type Bill, type Goal } from "@/components/dashboard/data";
import { useBank } from "@/components/dashboard/store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { NativeSelect, inputClass } from "@/components/forms/fields";
import { billSchema, goalSchema, type BillValues, type GoalValues } from "@/lib/schemas";
import { formatMoney } from "@/lib/rates";
import { cn } from "@/lib/utils";

const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

/* ------------------------------------------------------------------ goals */

/** Create a goal, or edit one when `goal` is given. */
export function GoalDialog({ open, onOpenChange, goal }: { open: boolean; onOpenChange: (o: boolean) => void; goal?: Goal }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        {open && <GoalForm key={goal?.id ?? "new"} goal={goal} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function GoalForm({ goal, onDone }: { goal?: Goal; onDone: () => void }) {
  const { state, run } = useBank();
  const savings = state.accounts.filter((a) => a.type === "savings");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GoalValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: { name: goal?.name ?? "", target: goal?.target, accountId: goal?.accountId ?? savings[0]?.id ?? "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await run({ type: "saveGoal", goal: { ...values, id: goal?.id } });
    if (!result.ok) return;
    toast.success(goal ? "Goal updated" : "Goal created", { description: goal ? undefined : "Add money to it from your checking account any time." });
    onDone();
  });

  const remove = async () => {
    if (!goal) return;
    setDeleting(true);
    const result = await run({ type: "deleteGoal", id: goal.id });
    setDeleting(false);
    if (!result.ok) return;
    toast.success("Goal deleted", { description: "The money stays in your savings account." });
    onDone();
  };

  if (!savings.length) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Goals need a savings account</DialogTitle>
          <DialogDescription>Goals keep track of money in a savings account, and you don’t have one yet. Ask us to open one at your branch or by phone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ink" size="md" onClick={onDone}>
            OK
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <DialogHeader>
        <DialogTitle className="font-heading text-xl">{goal ? "Edit goal" : "New savings goal"}</DialogTitle>
        <DialogDescription>
          {goal ? `${formatMoney(goal.saved)} saved so far.` : "Name what you’re saving for and how much you need."}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-5 grid gap-4">
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="goal-name" className="text-ink">What are you saving for?</FieldLabel>
          <Input id="goal-name" placeholder="For example, Japan in spring" maxLength={40} className={inputClass} aria-invalid={!!errors.name} {...register("name")} />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={!!errors.target}>
          <FieldLabel htmlFor="goal-target" className="text-ink">Target</FieldLabel>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate">$</span>
            <Input id="goal-target" type="number" min="1" step="1" className={cn(inputClass, "pl-7")} aria-invalid={!!errors.target} {...register("target", { valueAsNumber: true })} />
          </div>
          <FieldError errors={[errors.target]} />
        </Field>
        {!goal && savings.length > 1 && (
          <Field data-invalid={!!errors.accountId}>
            <FieldLabel htmlFor="goal-account" className="text-ink">Savings account</FieldLabel>
            <NativeSelect id="goal-account" {...register("accountId")}>
              {savings.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ••{a.mask}
                </option>
              ))}
            </NativeSelect>
            <FieldError errors={[errors.accountId]} />
          </Field>
        )}
      </div>

      {confirmDelete && (
        <p className="mt-5 rounded-xl bg-negative/10 px-4 py-3 text-sm text-ink">
          Delete this goal? The {formatMoney(goal?.saved ?? 0)} you’ve saved stays in your savings account.
        </p>
      )}

      <DialogFooter className="mt-6 gap-2 sm:justify-between">
        {goal ? (
          confirmDelete ? (
            <Button type="button" variant="destructive" size="md" onClick={remove} disabled={deleting}>
              {deleting ? <Loader2 className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />} Yes, delete goal
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="md" className="text-negative" onClick={() => setConfirmDelete(true)}>
              <Trash2 aria-hidden /> Delete
            </Button>
          )
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline-ink" size="md" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" variant="ink" size="md" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
            {goal ? "Save changes" : "Create goal"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

/* ------------------------------------------------------------------ bills */

/** Add a bill, or edit one when `bill` is given. */
export function BillDialog({ open, onOpenChange, bill }: { open: boolean; onOpenChange: (o: boolean) => void; bill?: Bill }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        {open && <BillForm key={bill?.id ?? "new"} bill={bill} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function BillForm({ bill, onDone }: { bill?: Bill; onDone: () => void }) {
  const { state, run } = useBank();
  const accounts = spendableAccounts(state);
  const fallback = primaryChecking(state)?.id ?? accounts[0]?.id ?? "";
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BillValues>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      name: bill?.name ?? "",
      amount: bill?.amount,
      dueDay: bill?.dueDay ?? 1,
      category: bill?.category ?? "bills",
      autopay: bill?.autopay ?? false,
      payFrom: bill?.payFrom ?? fallback,
    },
  });
  const autopay = useWatch({ control, name: "autopay" });

  const onSubmit = handleSubmit(async (values) => {
    const result = await run({ type: "saveBill", bill: { ...values, id: bill?.id } });
    if (!result.ok) return;
    toast.success(bill ? "Bill updated" : "Bill added", {
      description: values.autopay ? `Paid automatically on the ${ordinal(values.dueDay)} of each month.` : "We’ll remind you when it’s due.",
    });
    onDone();
  });

  const remove = async () => {
    if (!bill) return;
    setDeleting(true);
    const result = await run({ type: "deleteBill", id: bill.id });
    setDeleting(false);
    if (!result.ok) return;
    toast.success("Bill removed");
    onDone();
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <DialogHeader>
        <DialogTitle className="font-heading text-xl">{bill ? "Edit bill" : "Add a bill"}</DialogTitle>
        <DialogDescription>Bills you add show up in Coming up, and you can pay them in a tap.</DialogDescription>
      </DialogHeader>

      <div className="mt-5 grid gap-4">
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="bill-name" className="text-ink">Who’s it from?</FieldLabel>
          <Input id="bill-name" placeholder="For example, Con Edison" maxLength={60} className={inputClass} aria-invalid={!!errors.name} {...register("name")} />
          <FieldError errors={[errors.name]} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!!errors.amount}>
            <FieldLabel htmlFor="bill-amount" className="text-ink">Amount</FieldLabel>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate">$</span>
              <Input id="bill-amount" type="number" min="0" step="0.01" className={cn(inputClass, "pl-7")} aria-invalid={!!errors.amount} {...register("amount", { valueAsNumber: true })} />
            </div>
            <FieldError errors={[errors.amount]} />
          </Field>
          <Field data-invalid={!!errors.dueDay}>
            <FieldLabel htmlFor="bill-day" className="text-ink">Due each month on the</FieldLabel>
            <NativeSelect id="bill-day" {...register("dueDay", { valueAsNumber: true })}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {ordinal(d)}
                </option>
              ))}
            </NativeSelect>
            <FieldError errors={[errors.dueDay]} />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="bill-category" className="text-ink">Category</FieldLabel>
          <NativeSelect id="bill-category" {...register("category")}>
            {spendCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <div className="rounded-2xl bg-canvas p-4">
          <div className="flex items-center justify-between gap-4">
            <span>
              <span className="block text-sm font-semibold text-ink">Pay automatically</span>
              <span className="text-xs text-slate">On the due day, every month</span>
            </span>
            <Switch
              checked={!!autopay}
              onCheckedChange={(on) => setValue("autopay", on, { shouldValidate: true })}
              aria-label="Pay automatically"
              className="data-checked:bg-amber"
              disabled={!accounts.length}
            />
          </div>
          {autopay && (
            <Field data-invalid={!!errors.payFrom} className="mt-4">
              <FieldLabel htmlFor="bill-from" className="text-ink">Pay from</FieldLabel>
              <NativeSelect id="bill-from" {...register("payFrom")}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ••{a.mask} ({formatMoney(a.balance)})
                  </option>
                ))}
              </NativeSelect>
              <FieldDescription>If there isn’t enough money on the day, we’ll tell you and won’t try again that month.</FieldDescription>
              <FieldError errors={[errors.payFrom]} />
            </Field>
          )}
        </div>
      </div>

      {confirmDelete && <p className="mt-5 rounded-xl bg-negative/10 px-4 py-3 text-sm text-ink">Remove this bill? Past payments stay in your activity.</p>}

      <DialogFooter className="mt-6 gap-2 sm:justify-between">
        {bill ? (
          confirmDelete ? (
            <Button type="button" variant="destructive" size="md" onClick={remove} disabled={deleting}>
              {deleting ? <Loader2 className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />} Yes, remove bill
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="md" className="text-negative" onClick={() => setConfirmDelete(true)}>
              <Trash2 aria-hidden /> Remove
            </Button>
          )
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline-ink" size="md" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" variant="ink" size="md" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" aria-hidden />}
            {bill ? "Save changes" : "Add bill"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
