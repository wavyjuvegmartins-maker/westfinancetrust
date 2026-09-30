import type { Metadata } from "next";
import { LoansView } from "@/components/dashboard/loans-view";

export const metadata: Metadata = { title: "Loans" };

export default function Page() {
  return <LoansView />;
}
