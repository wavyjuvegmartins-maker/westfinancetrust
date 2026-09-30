import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/shell";
import { getSessionUser } from "@/lib/auth/session";
import { homeFor } from "@/lib/auth/types";
import { loadBank } from "@/lib/banking/load";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { default: "Home", template: "%s | West Finance Trust online banking" },
  robots: { index: false, follow: false },
};

// Online banking for customers. Staff go to the admin area; anyone still on
// their emailed password must choose their own first.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword || user.role !== "customer") redirect(homeFor(user));

  const bank = await loadBank(await createSupabaseServerClient(), user);
  return (
    <DashboardShell user={user} bank={bank}>
      {children}
    </DashboardShell>
  );
}
