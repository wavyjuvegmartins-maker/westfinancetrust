import { Phone } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { DrawnOrbit, Reveal } from "@/components/motion";
import { site } from "@/lib/site";

/** Closing call to action: accounts are opened in person or by phone. */
export function CtaBand({
  title = "Ready to bank with West Finance Trust?",
  body = "Accounts are opened with a member of our team, in a branch or over the phone. Bring a photo ID and proof of address and you can be set up the same day.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <section className="bg-surface py-16 sm:py-20">
      <div className="container-page">
        <Reveal className="relative overflow-hidden rounded-[2rem] bg-deep px-6 py-12 text-white sm:px-12 sm:py-16">
          <DrawnOrbit className="pointer-events-none absolute -right-24 -bottom-28 w-[34rem] text-amber opacity-90" />
          <div className="relative max-w-2xl">
            <h2 className="text-[clamp(1.9rem,3.6vw,2.75rem)] leading-[1.08] font-semibold tracking-[-0.03em]">
              {title}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-white/75">{body}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/contact#open-account">Arrange your account opening</ButtonLink>
              <a
                href={site.phoneHref}
                className="inline-flex h-12 items-center gap-2 rounded-full border border-white/35 px-6 text-[0.95rem] font-semibold text-white transition-colors hover:border-white hover:bg-white/10"
              >
                <Phone className="size-4" aria-hidden />
                Call {site.phone}
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
