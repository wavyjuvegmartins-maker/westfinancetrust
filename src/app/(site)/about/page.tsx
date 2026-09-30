import type { Metadata } from "next";
import { Handshake, MessageSquareText, Scale, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { CtaBand } from "@/components/cta-band";
import { FeatureList } from "@/components/feature-list";
import { Reveal } from "@/components/motion";
import { PageHeader } from "@/components/page-header";
import { Section, SectionIntro } from "@/components/section";
import { images } from "@/lib/images";

export const metadata: Metadata = {
  title: "About us",
  description: "West Finance Trust pairs in-person account opening with modern online banking.",
};

const principles = [
  { icon: Handshake, title: "People first", body: "Every relationship starts with a conversation, not a sign-up form." },
  { icon: MessageSquareText, title: "Plain language", body: "Fees, rates and terms written so you understand them the first time." },
  { icon: Scale, title: "Fair pricing", body: "No monthly fees on everyday accounts and no charges designed to catch you out." },
  { icon: ShieldCheck, title: "Secure by default", body: "Two-step login, alerts and card controls switched on from day one." },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="A bank you can walk into, and never have to"
        lede="West Finance Trust was built on a simple idea: the safest way to start a banking relationship is in person, and the most convenient way to run it is online."
        image={images.bankIllustration}
      >
        <ButtonLink href="/contact">Get in touch</ButtonLink>
      </PageHeader>

      <Section aria-labelledby="story-title">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <SectionIntro id="story-title" title="Why we open accounts in person" />
          <Reveal delay={0.1} className="space-y-5 text-lg leading-relaxed text-slate">
            <p>
              Most banks let anyone open an account from a phone in minutes. That’s convenient, and it’s also how
              fraudsters open accounts in other people’s names.
            </p>
            <p>
              We take a different route. You meet one of our team, we check your identity properly, and we set up your
              online banking together. It takes one visit or one phone call.
            </p>
            <p className="text-ink">
              After that, everything happens online: payments, transfers, savings and card controls, whenever you need
              them. And when you want to talk to someone, the person who opened your account is still here.
            </p>
          </Reveal>
        </div>
      </Section>

      <Section tone="paper" aria-labelledby="principles-title">
        <SectionIntro id="principles-title" title="What we stand for">
          Four principles that shape every product we offer.
        </SectionIntro>
        <FeatureList features={principles} columns={4} className="mt-14" />
      </Section>

      <CtaBand />
    </>
  );
}
