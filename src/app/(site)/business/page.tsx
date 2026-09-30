import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Download, Handshake, Layers, Store, Users, Wallet } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { CheckList } from "@/components/check-list";
import { ComingSoonBadge } from "@/components/coming-soon-badge";
import { CtaBand } from "@/components/cta-band";
import { FeatureList } from "@/components/feature-list";
import { Reveal } from "@/components/motion";
import { PageHeader } from "@/components/page-header";
import { ProductColumns } from "@/components/product-columns";
import { Section, SectionIntro } from "@/components/section";
import { SplitFeature } from "@/components/split-feature";
import { images } from "@/lib/images";
import { businessSavingsApy, formatRate, loanProducts, ratesNote } from "@/lib/rates";

export const metadata: Metadata = {
  title: "Business banking",
  description: "Business checking, savings and card acceptance, with a relationship manager you can call.",
};

const businessLoan = loanProducts.find((p) => p.id === "business")!;

const products = [
  {
    name: "Business Checking",
    summary: "For day-to-day income, supplier payments and payroll.",
    highlight: { value: "$0", label: "monthly fee with $2,500 average balance" },
    facts: [
      { term: "Included transactions", detail: "200 a month" },
      { term: "Team users", detail: "Unlimited" },
      { term: "Debit cards", detail: "One per user" },
      { term: "Cash deposits", detail: "At any branch" },
    ],
    featured: true,
  },
  {
    name: "Business Savings",
    summary: "Put tax money and reserves to work while they wait.",
    highlight: { value: formatRate(businessSavingsApy), label: "APY" },
    facts: [
      { term: "Minimum balance", detail: "None" },
      { term: "Transfers to checking", detail: "Instant" },
      { term: "Monthly fee", detail: "$0" },
      { term: "Interest paid", detail: "Monthly" },
    ],
  },
  {
    name: "Merchant Services",
    summary: "Take card payments in store, on the road and online.",
    highlight: { value: "Next day", label: "settlement into Business Checking" },
    facts: [
      { term: "Card terminals", detail: "Countertop or mobile" },
      { term: "Online payments", detail: "Payment links" },
      { term: "Contactless", detail: "Included" },
      { term: "Reporting", detail: "Daily" },
    ],
  },
];

const tools = [
  { icon: Users, title: "Team access", body: "Add colleagues with their own logins, limits and approval rights." },
  { icon: Layers, title: "Batch payments", body: "Pay suppliers and staff in one upload instead of one at a time." },
  { icon: Download, title: "Accounting exports", body: "Send transactions to your bookkeeping software in the format it expects." },
  { icon: Handshake, title: "A named relationship manager", body: "One person who knows your business and picks up the phone." },
  { icon: Wallet, title: "Cash handling", body: "Deposit takings at any branch and see them in online banking straight away." },
  { icon: Store, title: "Multi-location", body: "Run separate accounts for each site and see them all in one view." },
];

export default function BusinessPage() {
  return (
    <>
      <PageHeader
        title="Business banking with a banker you can call"
        lede="Accounts, payments and card acceptance for small and growing businesses. We open your account in person, then give your whole team the tools to run it online."
        image={images.moneyRoad}
        imageClassName="object-[center_40%]"
      >
        <ButtonLink href="/contact#open-account">Talk to a business banker</ButtonLink>
        <ButtonLink href="/login" variant="outline-ink">Log in</ButtonLink>
      </PageHeader>

      <Section aria-labelledby="business-accounts-title">
        <SectionIntro id="business-accounts-title" title="Accounts built around how you get paid">
          Start with Business Checking and add the rest as you need it.
        </SectionIntro>
        <div className="mt-12">
          <ProductColumns products={products} />
        </div>
        <p className="mt-6 text-sm text-slate">{ratesNote}</p>
      </Section>

      <Section tone="paper" aria-labelledby="terminal-title">
        <SplitFeature image={images.posTerminal} imageClassName="aspect-[5/4] bg-[#eef2f7] object-contain p-[14%]">
          <SectionIntro id="terminal-title" title="Get paid the way your customers want to pay">
            Card terminals, contactless and payment links, with every sale landing in your Business Checking account.
          </SectionIntro>
          <CheckList
            className="mt-8"
            items={[
              "Chip, contactless and mobile wallet payments",
              "Send payment links by email or text",
              "See every sale in online banking the same day",
            ]}
          />
        </SplitFeature>
      </Section>

      <Section aria-labelledby="tools-title">
        <SectionIntro id="tools-title" title="Tools for the whole team">
          Business online banking is built for more than one person, with the controls to match.
        </SectionIntro>
        <FeatureList features={tools} className="mt-14" />
      </Section>

      <Section tone="ink" aria-labelledby="biz-loans-title" className="py-16 sm:py-20 lg:py-20">
        <Reveal className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <ComingSoonBadge tone="light" />
            <h2 id="biz-loans-title" className="mt-5 text-[clamp(1.8rem,3.4vw,2.5rem)] leading-tight font-semibold tracking-[-0.03em]">
              Business loans from {formatRate(businessLoan.fromApr)} APR are on the way
            </h2>
            <p className="mt-3 text-lg text-white/70">
              {businessLoan.amounts} for working capital, equipment and expansion.
            </p>
          </div>
          <Link
            href="/loans#waitlist"
            className="inline-flex h-12 shrink-0 items-center gap-2 self-start rounded-full bg-amber px-6 font-semibold text-deep transition-colors hover:bg-amber-strong lg:self-auto"
          >
            Join the waitlist
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Reveal>
      </Section>

      <CtaBand
        title="Let’s talk about your business"
        body="Book time with a business banker at a branch or by phone. Bring your business registration documents and ID for everyone who will sign on the account."
      />
    </>
  );
}
