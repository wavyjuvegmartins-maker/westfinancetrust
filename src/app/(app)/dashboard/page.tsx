import type { Metadata } from "next";
import { RecentActivity } from "@/components/dashboard/activity";
import { BalanceHero } from "@/components/dashboard/balance-hero";
import { SpendingBreakdown } from "@/components/dashboard/spending";
import { CardWidget, Goals, LiveInterest, LoansTeaser, UpcomingBills } from "@/components/dashboard/widgets";

export const metadata: Metadata = { title: "Home" };

export default function DashboardHome() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
      <div className="lg:col-span-8">
        <BalanceHero />
      </div>
      {/* On phones, recent activity comes straight after the balance. */}
      <CardWidget className="max-lg:order-2 lg:col-span-4" />

      <RecentActivity className="max-lg:order-1 lg:col-span-7" />
      <SpendingBreakdown className="max-lg:order-3 lg:col-span-5" />

      <Goals className="max-lg:order-3 lg:col-span-5" />
      <UpcomingBills className="max-lg:order-3 lg:col-span-4" />
      <div className="grid min-w-0 content-start gap-4 max-lg:order-3 lg:col-span-3 lg:gap-5">
        <LiveInterest />
        <LoansTeaser />
      </div>
    </div>
  );
}
