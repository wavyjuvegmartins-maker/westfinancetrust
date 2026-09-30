import type { Metadata } from "next";
import { BadgePercent, CalendarCheck, Lock, Scale } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { ComingSoonBadge } from "@/components/coming-soon-badge";
import { FeatureList } from "@/components/feature-list";
import { LoanRates } from "@/components/loan-rates";
import { Reveal } from "@/components/motion";
import { PageHeader } from "@/components/page-header";
import { Section, SectionIntro } from "@/components/section";
import { WaitlistForm } from "@/components/forms/waitlist-form";
import { images } from "@/lib/images";
import { formatRate, lowestLoanApr, ratesNote } from "@/lib/rates";

export const metadata: Metadata = {
  title: "Loans (coming soon)",
  description: `Personal, auto, home and business loans from ${formatRate(lowestLoanApr)} APR are coming soon. Join the waitlist.`,
};

const promises = [
  { icon: Lock, title: "Fixed rates", body: "The rate you’re offered is the rate you pay for the whole term." },
  { icon: Scale, title: "No early repayment fees", body: "Pay off part or all of your loan early without a penalty." },
  { icon: BadgePercent, title: "Better rates for customers", body: "Existing West Finance Trust customers will get our lowest rates." },
  { icon: CalendarCheck, title: "Payments that fit", body: "Pick the day your payment comes out so it lines up with payday." },
];

const faqs = [
  {
    q: "When will loans be available?",
    a: "We’re in the final stages of preparing our lending service. Join the waitlist and we’ll email you the day applications open.",
  },
  {
    q: "Do I need to be a West Finance Trust customer?",
    a: "Yes. Loans will be paid into, and repaid from, a West Finance Trust account. If you don’t have one yet, you can open one in person before loans launch.",
  },
  {
    q: "Will joining the waitlist affect my credit score?",
    a: "No. Joining the waitlist only saves your email address and the loan you’re interested in. There’s no credit check.",
  },
  {
    q: "Are the rates on this page guaranteed?",
    a: "No. They’re the starting rates we expect to offer. The rate you’re offered will depend on your circumstances, the amount and the term, and all loans will be subject to approval.",
  },
];

export default function LoansPage() {
  return (
    <>
      <PageHeader
        badge={<ComingSoonBadge />}
        title="Low-rate loans, coming soon"
        lede={`Personal, auto, home and business loans from ${formatRate(lowestLoanApr)} APR, with fixed rates and no fee for paying early. Join the waitlist to be first in line.`}
        image={images.growthCoinStacks}
        imageClassName="object-[center_62%]"
      >
        <ButtonLink href="#waitlist">Join the waitlist</ButtonLink>
        <ButtonLink href="#rates" variant="outline-ink">See starting rates</ButtonLink>
      </PageHeader>

      <Section id="rates" aria-labelledby="rates-title" className="scroll-mt-16">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <div>
            <SectionIntro id="rates-title" title="Starting rates for every kind of loan">
              Borrow for the things that matter, at rates set to be among the lowest you’ll find.
            </SectionIntro>
            <p className="mt-6 text-sm leading-relaxed text-slate">
              {ratesNote} Loans will be subject to approval.
            </p>
          </div>
          <LoanRates detailed />
        </div>
      </Section>

      <Section tone="paper" aria-labelledby="promise-title">
        <SectionIntro id="promise-title" title="What you can count on">
          The same plain dealing as our accounts, carried over to lending.
        </SectionIntro>
        <FeatureList features={promises} columns={4} className="mt-14" />
      </Section>

      <Section tone="ink" id="waitlist" aria-labelledby="waitlist-title" className="scroll-mt-16">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          <SectionIntro id="waitlist-title" tone="light" title="Be first to apply">
            Tell us which loan you’re interested in. We’ll email you once, when applications open, and nothing else.
          </SectionIntro>
          <WaitlistForm tone="light" idPrefix="loans-waitlist" />
        </div>
      </Section>

      <Section aria-labelledby="faq-title">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionIntro id="faq-title" title="Questions about loans" />
          <Reveal delay={0.1} className="divide-y divide-line border-y border-line">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-paper text-xl leading-none text-ink transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-prose leading-relaxed text-slate">{f.a}</p>
              </details>
            ))}
          </Reveal>
        </div>
      </Section>
    </>
  );
}
