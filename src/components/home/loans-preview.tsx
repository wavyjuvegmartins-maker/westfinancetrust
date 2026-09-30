import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ComingSoonBadge } from "@/components/coming-soon-badge";
import { LoanRates } from "@/components/loan-rates";
import { Section, SectionIntro } from "@/components/section";
import { WaitlistForm } from "@/components/forms/waitlist-form";

export function LoansPreview() {
  return (
    <Section tone="ink" aria-labelledby="loans-title" className="relative overflow-hidden">
      <div className="grid gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-20">
        <div>
          <ComingSoonBadge tone="light" />
          <SectionIntro id="loans-title" tone="light" title="Loans with rates worth waiting for" className="mt-6">
            We’re building lending the way we build accounts: fixed rates, plain terms and no fee for paying early. Join
            the list and you’ll hear first when applications open.
          </SectionIntro>
          <div className="mt-9 max-w-lg">
            <WaitlistForm tone="light" idPrefix="home-waitlist" />
          </div>
        </div>

        <div>
          <LoanRates tone="light" />
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-white/55">
            <p>Starting rates. Your rate will depend on your circumstances.</p>
            <Link href="/loans" className="inline-flex items-center gap-1.5 font-semibold text-white hover:text-amber">
              See loan details
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
