import { CalendarCheck, Phone } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { GrowLine, RevealGroup, RevealItem } from "@/components/motion";
import { Section, SectionIntro } from "@/components/section";
import { site } from "@/lib/site";

export const openingSteps = [
  {
    title: "Visit a branch or call us",
    body: "Bring a government photo ID and a recent proof of address. We’ll open your account with you there and then.",
  },
  {
    title: "Get your login details",
    body: "Before you leave, we set up online banking and give you your user ID and a temporary password.",
  },
  {
    title: "Log in and make it yours",
    body: "Choose a new password, turn on two-step login and you’re ready to bank from anywhere.",
  },
];

export function GettingStarted() {
  return (
    <Section tone="paper" id="getting-started" aria-labelledby="start-title" className="scroll-mt-20">
      <SectionIntro id="start-title" title="Three steps to online banking">
        We open every account with a person, not a web form. It takes a little longer the first time and makes your
        account far harder for anyone else to take over.
      </SectionIntro>

      <RevealGroup as="ol" stagger={0.18} className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
        {/* runs from the centre of the first marker to the centre of the last (3 columns, 2rem gaps) */}
        <GrowLine className="absolute top-6 left-6 hidden h-px w-[calc((200%+4rem)/3)] bg-ink/15 md:block" />
        {openingSteps.map((step, i) => (
          <RevealItem as="li" key={step.title} className="relative">
            <span className="relative flex size-12 items-center justify-center rounded-full bg-deep font-heading text-lg font-semibold text-amber ring-8 ring-paper">
              {i + 1}
            </span>
            <h3 className="mt-6 text-xl font-semibold tracking-[-0.015em]">{step.title}</h3>
            <p className="mt-2.5 leading-relaxed text-slate">{step.body}</p>
          </RevealItem>
        ))}
      </RevealGroup>

      <div className="mt-14 flex flex-wrap gap-3">
        <ButtonLink href="/contact#open-account" variant="ink">
          <CalendarCheck aria-hidden />
          Arrange your account opening
        </ButtonLink>
        <a
          href={site.phoneHref}
          className="inline-flex h-12 items-center gap-2 rounded-full border border-ink/25 px-6 text-[0.95rem] font-semibold text-ink transition-colors hover:border-ink"
        >
          <Phone className="size-4" aria-hidden />
          {site.phone}
        </a>
      </div>
    </Section>
  );
}
