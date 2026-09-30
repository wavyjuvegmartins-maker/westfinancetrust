import { ButtonLink } from "@/components/button-link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <section className="container-page flex flex-col items-start py-28 sm:py-36">
          <p className="figures font-heading text-7xl font-semibold tracking-[-0.04em] text-amber-strong">404</p>
          <h1 className="mt-6 text-[clamp(2rem,4vw,3rem)] leading-tight font-semibold tracking-[-0.03em]">
            This page doesn’t exist
          </h1>
          <p className="mt-4 max-w-lg text-lg text-slate">
            The link may be out of date, or the address may have a typo. Head back to the homepage or log in to online
            banking.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/">Go to the homepage</ButtonLink>
            <ButtonLink href="/login" variant="outline-ink">Log in</ButtonLink>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
