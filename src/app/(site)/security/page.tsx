import type { Metadata } from "next";
import { BellRing, Fingerprint, KeyRound, Radar, ShieldAlert, Snowflake, UserCheck } from "lucide-react";
import { CheckList } from "@/components/check-list";
import { FeatureList } from "@/components/feature-list";
import { Reveal } from "@/components/motion";
import { PageHeader } from "@/components/page-header";
import { Section, SectionIntro } from "@/components/section";
import { SplitFeature } from "@/components/split-feature";
import { images } from "@/lib/images";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Security",
  description: "How West Finance Trust protects your accounts, and how to spot and report fraud.",
};

const protections = [
  { icon: UserCheck, title: "Verified in person", body: "Every account is opened face to face with checked ID, so nobody can open one in your name online." },
  { icon: KeyRound, title: "Two-step login", body: "New devices need a one-time code sent to the phone number we verified with you." },
  { icon: Fingerprint, title: "Encrypted connections", body: "Everything between your device and our systems is encrypted, and sessions time out when idle." },
  { icon: Radar, title: "Fraud monitoring", body: "Payments are checked against your usual patterns, and anything unusual is paused for review." },
  { icon: BellRing, title: "Alerts you choose", body: "Get told about logins, payments and changes to your details the moment they happen." },
  { icon: Snowflake, title: "Card freeze", body: "Stop your card working in one tap, and start it again when you’re ready." },
];

const neverAsk = [
  "Your online banking password or full PIN",
  "A one-time code we’ve sent you",
  "To move money to a “safe account”",
  "To download software so we can see your screen",
];

const tips = [
  `Type our address, ${site.domain}, yourself instead of following links in messages`,
  `Our emails only ever come from an address ending @${site.domain}`,
  "Use a password you don’t use anywhere else",
  "Keep your phone’s software up to date",
  "Turn on alerts for every card payment",
];

export default function SecurityPage() {
  return (
    <>
      <PageHeader
        title="Your money, watched closely"
        lede="Security starts before you ever log in: we meet you and check your ID in person. Online banking adds layers of protection on top, and puts the controls in your hands."
        image={images.securityLock}
      />

      <Section aria-labelledby="protect-title">
        <SectionIntro id="protect-title" title="How we protect your accounts">
          Six layers working together, most of them without you having to lift a finger.
        </SectionIntro>
        <FeatureList features={protections} className="mt-14" />
      </Section>

      <Section tone="paper" aria-labelledby="watch-title">
        <SplitFeature image={images.everyDollar} imageClassName="aspect-[2/1]">
          <SectionIntro id="watch-title" title="Every dollar has someone watching over it">
            Our fraud team reviews flagged payments around the clock. If something looks wrong, we pause it and contact
            you before any money leaves.
          </SectionIntro>
        </SplitFeature>
      </Section>

      <Section aria-labelledby="never-title">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-20">
          <Reveal className="rounded-3xl bg-amber-soft p-8 sm:p-10">
            <ShieldAlert className="size-8 text-amber-ink" aria-hidden />
            <h2 id="never-title" className="mt-5 text-[clamp(1.6rem,3vw,2.2rem)] leading-tight font-semibold tracking-[-0.025em]">
              We will never ask you for
            </h2>
            <CheckList items={neverAsk} className="mt-6" />
            <p className="mt-6 leading-relaxed text-ink/80">
              If anyone asks, even if they say they’re from West Finance Trust, hang up and call us on the number on
              the back of your card.
            </p>
          </Reveal>
          <Reveal delay={0.15} className="lg:pt-10">
            <h2 className="text-[clamp(1.6rem,3vw,2.2rem)] leading-tight font-semibold tracking-[-0.025em]">
              Simple habits that keep you safe
            </h2>
            <CheckList items={tips} className="mt-6" />
          </Reveal>
        </div>
      </Section>

      <Section tone="ink" aria-labelledby="report-title" className="py-16 sm:py-20 lg:py-20">
        <Reveal className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h2 id="report-title" className="text-[clamp(1.8rem,3.4vw,2.5rem)] leading-tight font-semibold tracking-[-0.03em]">
              Think something’s wrong? Call us now
            </h2>
            <p className="mt-3 text-lg text-white/70">
              Freeze your card in online banking first, then call. Fraud reports are answered around the clock.
            </p>
          </div>
          <a
            href={site.phoneHref}
            className="inline-flex h-12 shrink-0 items-center self-start rounded-full bg-amber px-6 font-semibold text-deep transition-colors hover:bg-amber-strong lg:self-auto"
          >
            Report fraud: {site.phone}
          </a>
        </Reveal>
      </Section>
    </>
  );
}
