import type { Metadata } from "next";
import { RecentActivity } from "@/components/dashboard/activity";
import { BalanceHero } from "@/components/dashboard/balance-hero";
import { SpendingBreakdown } from "@/components/dashboard/spending";
import { CardWidget, Goals, LiveInterest, LoansTeaser, UpcomingBills } from "@/components/dashboard/widgets";

export const metadata: Metadata = { title: "Home" };

export default function DashboardHome() {
  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <BalanceHero />
      </div>
      <CardWidget className="lg:col-span-4" />

      <RecentActivity className="lg:col-span-7" />
      <SpendingBreakdown className="lg:col-span-5" />

      <Goals className="lg:col-span-5" />
      <UpcomingBills className="lg:col-span-4" />
      <div className="grid content-start gap-5 lg:col-span-3">
        <LiveInterest />
        <LoansTeaser />
      </div>
    </div>
  );
}
