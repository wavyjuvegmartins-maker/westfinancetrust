import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/shell";
import { getSessionUser } from "@/lib/auth/session";
import { homeFor } from "@/lib/auth/types";
import { unreadForStaff } from "@/lib/messages/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { default: "Staff", template: "%s | West Finance Trust staff" },
  robots: { index: false, follow: false },
};

// Staff only: admins and account openers. Customers are sent to their dashboard.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword || user.role === "customer") redirect(homeFor(user));

  const supabase = await createSupabaseServerClient();
  const [{ count }, unreadInbox] = await Promise.all([
    supabase.from("contact_messages").select("id", { count: "exact", head: true }).is("handled_at", null),
    unreadForStaff(),
  ]);

  return (
    <AdminShell user={user} openMessages={count ?? 0} unreadInbox={unreadInbox}>
      {children}
    </AdminShell>
  );
}
