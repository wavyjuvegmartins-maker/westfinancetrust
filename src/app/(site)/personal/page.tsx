import type { Metadata } from "next";
import { ArrowRightLeft, BellRing, Camera, CalendarClock, FileText, PieChart } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { CheckList } from "@/components/check-list";
import { CtaBand } from "@/components/cta-band";
import { FeatureList } from "@/components/feature-list";
import { PageHeader } from "@/components/page-header";
import { ProductColumns } from "@/components/product-columns";
import { Section, SectionIntro } from "@/components/section";
import { SplitFeature } from "@/components/split-feature";
import { images } from "@/lib/images";
import { certificateApy, formatRate, ratesNote, savingsApy } from "@/lib/rates";

export const metadata: Metadata = {
  title: "Personal banking",
  description: "Everyday Checking with no monthly fee, High-Yield Savings and fixed-term Certificates, managed online.",
};

const products = [
  {
    name: "Everyday Checking",
    summary: "The account your pay goes into and your bills come out of.",
    highlight: { value: "$0", label: "monthly maintenance fee" },
    facts: [
      { term: "Minimum to open", detail: "$25" },
      { term: "Debit card", detail: "Included" },
      { term: "Mobile check deposit", detail: "Included" },
      { term: "Overdraft protection", detail: "Optional" },
    ],
  },
  {
    id: "savings",
    name: "High-Yield Savings",
    summary: "Easy-access savings that pays a rate worth having.",
    highlight: { value: formatRate(savingsApy), label: "APY on every balance" },
    facts: [
      { term: "Minimum balance", detail: "None" },
      { term: "Monthly fee", detail: "$0" },
      { term: "Withdrawals", detail: "Any time" },
      { term: "Interest paid", detail: "Monthly" },
    ],
    featured: true,
  },
  {
    name: "12-month Certificate",
    summary: "Lock in a fixed rate for money you won’t need for a year.",
    highlight: { value: formatRate(certificateApy), label: "APY, fixed for 12 months" },
    facts: [
      { term: "Minimum to open", detail: "$1,000" },
      { term: "Rate", detail: "Fixed" },
      { term: "At maturity", detail: "Renew or withdraw" },
      { term: "Early withdrawal", detail: "Penalty applies" },
    ],
  },
];

const everyday = [
  { icon: Camera, title: "Deposit checks by photo", body: "Snap both sides in online banking and the money is on its way." },
  { icon: ArrowRightLeft, title: "Instant transfers", body: "Move money between your West Finance Trust accounts in seconds, day or night." },
  { icon: CalendarClock, title: "Bill pay and scheduling", body: "Set up one-off or recurring payments and see what’s due before it leaves." },
  { icon: BellRing, title: "Balance and payment alerts", body: "Choose the alerts you want, from low balances to large payments." },
  { icon: PieChart, title: "Spending insights", body: "See where your money goes each month, grouped by category." },
  { icon: FileText, title: "Paperless statements", body: "Download up to seven years of statements whenever you need them." },
];

export default function PersonalPage() {
  return (
    <>
      <PageHeader
        title="Personal banking that pays attention"
        lede="Checking and savings accounts opened with a person and run from your phone. No monthly fees on everyday accounts, and a savings rate that’s worth having."
        image={images.mobileBankingWoman}
      >
        <ButtonLink href="/contact#open-account">Arrange your account opening</ButtonLink>
        <ButtonLink href="/login" variant="outline-ink">Log in</ButtonLink>
      </PageHeader>

      <Section aria-labelledby="accounts-title">
        <SectionIntro id="accounts-title" title="Choose the accounts that fit">
          Most customers open Everyday Checking and High-Yield Savings together, so money can move between them
          instantly.
        </SectionIntro>
        <div className="mt-12">
          <ProductColumns products={products} />
        </div>
        <p className="mt-6 text-sm text-slate">{ratesNote}</p>
      </Section>

      <Section tone="paper" aria-labelledby="everyday-title">
        <SectionIntro id="everyday-title" title="Everything you do at a branch, from your phone">
          Once your account is open, online banking handles the day to day.
        </SectionIntro>
        <FeatureList features={everyday} className="mt-14" />
      </Section>

      <Section aria-labelledby="receipts-title">
        <SplitFeature image={images.phoneReceipt} imageClassName="aspect-[5/4]">
          <SectionIntro id="receipts-title" title="Every payment, clearly labelled">
            No mystery codes on your statement. Each transaction shows who you paid, where and when, with the
            merchant’s name in plain words.
          </SectionIntro>
          <CheckList
            className="mt-8"
            items={[
              "Search your transactions by name, amount or date",
              "Add notes and receipts to any payment",
              "Dispute a charge straight from the transaction",
            ]}
          />
        </SplitFeature>
      </Section>

      <CtaBand />
    </>
  );
}
