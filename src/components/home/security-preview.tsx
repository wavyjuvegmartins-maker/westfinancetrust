import { ArrowRight, BellRing, KeyRound, Snowflake, Radar } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { FeatureList } from "@/components/feature-list";
import { Section, SectionIntro } from "@/components/section";
import { SplitFeature } from "@/components/split-feature";
import { images } from "@/lib/images";

const protections = [
  { icon: KeyRound, title: "Two-step login", body: "A one-time code confirms it’s you on every new device." },
  { icon: BellRing, title: "Instant alerts", body: "Know about every payment, login and change as it happens." },
  { icon: Snowflake, title: "Card freeze", body: "Lock a missing card in one tap and unlock it when it turns up." },
  { icon: Radar, title: "Fraud monitoring", body: "Unusual activity is flagged and checked around the clock." },
];

export function SecurityPreview() {
  return (
    <Section aria-labelledby="security-title">
      <SplitFeature image={images.securityLock} imageClassName="aspect-[5/4]" reverse>
        <SectionIntro id="security-title" title="Security you can see working">
          Meeting you in person is our first line of defence. Online banking adds the rest, and you stay in control of
          all of it.
        </SectionIntro>
        <FeatureList features={protections} columns={2} className="mt-10 gap-y-8" />
        <ButtonLink href="/security" variant="outline-ink" size="md" className="mt-10">
          How we protect you
          <ArrowRight aria-hidden />
        </ButtonLink>
      </SplitFeature>
    </Section>
  );
}
