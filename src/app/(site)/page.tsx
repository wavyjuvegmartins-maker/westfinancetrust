import { Hero } from "@/components/home/hero";
import { AccountTabs } from "@/components/home/account-tabs";
import { SavingsSection } from "@/components/home/savings-section";
import { LoansPreview } from "@/components/home/loans-preview";
import { SecurityPreview } from "@/components/home/security-preview";
import { GettingStarted } from "@/components/home/getting-started";

export default function Home() {
  return (
    <>
      <Hero />
      <AccountTabs />
      <SavingsSection />
      <LoansPreview />
      <SecurityPreview />
      <GettingStarted />
    </>
  );
}
