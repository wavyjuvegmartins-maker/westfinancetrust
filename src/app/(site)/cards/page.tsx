import type { Metadata } from "next";
import { BellRing, Globe, Gauge, Nfc, RefreshCw, Snowflake } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { CardVisual } from "@/components/card-visual";
import { CheckList } from "@/components/check-list";
import { CtaBand } from "@/components/cta-band";
import { FeatureList } from "@/components/feature-list";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion";
import { PageHeader } from "@/components/page-header";
import { Section, SectionIntro } from "@/components/section";
import { SplitFeature } from "@/components/split-feature";
import { images } from "@/lib/images";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Cards",
  description: "A debit card with every control in online banking: freeze, alerts, limits and mobile wallets.",
};

const controls = [
  { icon: Snowflake, title: "Freeze in one tap", body: "Can’t find your card? Freeze it, look again, and unfreeze it if it turns up." },
  { icon: BellRing, title: "Real-time alerts", body: "A notification for every purchase, so nothing goes through without you knowing." },
  { icon: Gauge, title: "Your own limits", body: "Set daily limits for spending and cash withdrawals, and change them any time." },
  { icon: Nfc, title: "Contactless and mobile wallets", body: "Tap your card or your phone at the till. Add it to your wallet in a minute." },
  { icon: Globe, title: "Travel ready", body: "Switch overseas and online payments on or off depending on where you are." },
  { icon: RefreshCw, title: "Replacements in-app", body: "Order a new card from online banking. No forms, no phone queue." },
];

const lostCardSteps = [
  { title: "Freeze your card", body: "Log in and freeze it straight away. Nobody can use it while it’s frozen." },
  { title: "Tell us what happened", body: `If it’s lost or stolen, report it in online banking or call ${site.phone}.` },
  { title: "Get a replacement", body: "Your new card arrives with a new number. Your direct debits carry over." },
];

export default function CardsPage() {
  return (
    <>
      <PageHeader
        title="A card that answers to you"
        lede="Your West Finance Trust debit card comes with your checking account, and every setting that matters is in online banking, not on hold with a call center."
        image={images.cardWomanWhite}
        imageClassName="object-[center_30%]"
      >
        <ButtonLink href="/login">Manage your card</ButtonLink>
        <ButtonLink href="/contact#open-account" variant="outline-ink">Get a card</ButtonLink>
      </PageHeader>

      <Section aria-labelledby="debit-title">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <Reveal y={48} scale={0.94} className="mx-auto w-full max-w-md -rotate-3 lg:max-w-lg">
            <CardVisual />
          </Reveal>
          <div>
            <SectionIntro id="debit-title" title="The West Finance Trust debit card">
              Spend straight from Everyday Checking, anywhere cards are accepted. There’s no annual fee and no charge
              for using it abroad.
            </SectionIntro>
            <CheckList
              className="mt-8"
              items={[
                "Included free with Everyday Checking",
                "Chip and PIN, contactless and mobile wallet ready",
                "Free cash withdrawals at our branches",
                "Zero liability for purchases you didn’t make",
              ]}
            />
          </div>
        </div>
      </Section>

      <Section tone="paper" aria-labelledby="controls-title">
        <SectionIntro id="controls-title" title="Every control, in online banking">
          Change how your card works in seconds, whenever you need to.
        </SectionIntro>
        <FeatureList features={controls} className="mt-14" />
      </Section>

      <Section aria-labelledby="receipt-title">
        <SplitFeature image={images.phoneReceipt} imageClassName="aspect-[5/4]" reverse>
          <SectionIntro id="receipt-title" title="Know exactly where you spent it">
            Every card payment shows the merchant’s real name and location, and you can attach a photo of the receipt.
          </SectionIntro>
          <CheckList
            className="mt-8"
            items={[
              "Pending payments show the moment you tap",
              "Recurring subscriptions are easy to spot",
              "Dispute a payment in a few taps",
            ]}
          />
        </SplitFeature>
      </Section>

      <Section tone="ink" aria-labelledby="lost-title">
        <SectionIntro id="lost-title" tone="light" title="Lost your card? Here’s what to do">
          Three steps, and the first one takes seconds.
        </SectionIntro>
        <RevealGroup as="ol" stagger={0.15} className="mt-12 grid gap-10 md:grid-cols-3">
          {lostCardSteps.map((step, i) => (
            <RevealItem as="li" key={step.title} className="border-t border-white/15 pt-6">
              <span className="font-heading text-lg font-semibold text-amber">{i + 1}</span>
              <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-white/70">{step.body}</p>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      <CtaBand />
    </>
  );
}
