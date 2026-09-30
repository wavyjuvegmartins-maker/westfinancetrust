import type { Metadata } from "next";
import { RegisterCustomerForm } from "@/components/admin/register-form";
import { PageTitle } from "@/components/admin/ui";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Register a customer" };

export default async function NewCustomerPage() {
  const user = await getSessionUser();
  return (
    <>
      <PageTitle title="Register a customer">
        Creates their login, opens their accounts and emails them a one-time password.
      </PageTitle>
      <RegisterCustomerForm isAdmin={user?.role === "admin"} />
    </>
  );
}
