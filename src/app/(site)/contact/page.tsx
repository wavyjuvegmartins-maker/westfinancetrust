import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { CheckList } from "@/components/check-list";
import { ContactForm } from "@/components/forms/contact-form";
import { openingSteps } from "@/components/home/getting-started";
import { PageHeader } from "@/components/page-header";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion";
import { Section } from "@/components/section";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact us",
  description: "Call, email or visit West Finance Trust, or send us a message to arrange your account opening.",
};

const bring = [
  "A government-issued photo ID, such as a passport or driver’s license",
  "Proof of address from the last three months, such as a utility bill",
  "Your Social Security number or ITIN",
  "For business accounts: registration documents and ID for every signer",
];

export default function ContactPage() {
  return (
    <>
      <PageHeader
        title="Talk to a real person"
        lede="Call us, write to us or come in. Whether you’re ready to open an account or just have a question, you’ll reach someone who can help."
      />

      <Section aria-label="Ways to reach us" className="py-14 sm:py-16 lg:py-16">
        <RevealGroup as="ul" className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1fr_1.45fr_1fr_1.2fr]">
          <RevealItem as="li">
            <Phone className="size-6 text-amber-strong" aria-hidden />
            <h2 className="mt-4 font-sans text-sm font-medium text-slate">Call us</h2>
            <a href={site.phoneHref} className="mt-1 block font-heading text-lg font-semibold text-ink hover:text-amber-ink">
              {site.phone}
            </a>
          </RevealItem>
          <RevealItem as="li">
            <Mail className="size-6 text-amber-strong" aria-hidden />
            <h2 className="mt-4 font-sans text-sm font-medium text-slate">Email</h2>
            <a href={`mailto:${site.email}`} className="mt-1 block font-heading text-lg font-semibold [overflow-wrap:anywhere] text-ink hover:text-amber-ink">
              {site.email}
            </a>
          </RevealItem>
          <RevealItem as="li">
            <MapPin className="size-6 text-amber-strong" aria-hidden />
            <h2 className="mt-4 font-sans text-sm font-medium text-slate">{site.branch.name}</h2>
            <address className="mt-1 leading-relaxed font-medium text-ink not-italic">
              {site.branch.lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          </RevealItem>
          <RevealItem as="li">
            <Clock className="size-6 text-amber-strong" aria-hidden />
            <h2 className="mt-4 font-sans text-sm font-medium text-slate">Opening hours</h2>
            <dl className="mt-1 space-y-1 text-ink">
              {site.hours.map((h) => (
                <div key={h.days}>
                  <dt className="inline font-medium">{h.days}: </dt>
                  <dd className="inline">{h.time}</dd>
                </div>
              ))}
            </dl>
          </RevealItem>
        </RevealGroup>
      </Section>

      <Section tone="paper" id="open-account" aria-labelledby="open-title" className="scroll-mt-16">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <h2 id="open-title" className="text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-semibold tracking-[-0.03em]">
              Opening an account
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate">
              Accounts are opened with a member of our team, at a branch or over the phone. Send us a message and
              we’ll arrange a time that suits you.
            </p>

            <h3 className="mt-10 text-lg font-semibold">What to bring</h3>
            <CheckList items={bring} className="mt-4" />

            <h3 className="mt-10 text-lg font-semibold">What happens next</h3>
            <RevealGroup as="ol" stagger={0.12} className="mt-4 space-y-4">
              {openingSteps.map((step, i) => (
                <RevealItem as="li" key={step.title} className="flex gap-4">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-deep font-heading text-sm font-semibold text-amber">
                    {i + 1}
                  </span>
                  <p className="leading-relaxed text-slate">
                    <span className="font-semibold text-ink">{step.title}.</span> {step.body}
                  </p>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>

          <Reveal delay={0.1} className="rounded-3xl bg-surface p-6 ring-1 ring-line sm:p-10">
            <h2 className="text-2xl font-semibold tracking-[-0.02em]">Send us a message</h2>
            <p className="mt-2 text-slate">We reply within one business day.</p>
            <div className="mt-8">
              <ContactForm />
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  );
}
