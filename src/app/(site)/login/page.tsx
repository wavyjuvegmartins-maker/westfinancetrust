import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Image from "next/image";
import { CircleCheck, ShieldCheck } from "lucide-react";
import { getSessionUser } from "@/lib/auth/session";
import { homeFor } from "@/lib/auth/types";
import { CardVisual } from "@/components/card-visual";
import { LoginForm } from "@/components/forms/login-form";
import { DrawnOrbit, Reveal, RevealGroup, RevealItem } from "@/components/motion";
import { images } from "@/lib/images";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to West Finance Trust online banking.",
};

const reminders = [
  `Check the address bar shows ${site.domain} (spelled “finace”) before you enter your details.`,
  "We’ll never ask for your password or a one-time code by phone, email or text.",
  "Using a shared computer? Log out and close the browser when you’re done.",
];

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // Already signed in: go straight to the dashboard.
  const user = await getSessionUser();
  if (user) redirect(homeFor(user));
  const { signedOut } = await searchParams;

  return (
    <div className="grid lg:min-h-[calc(100vh-4.5rem)] lg:grid-cols-2">
      {/* In the installed app on a phone this becomes an app sign-in screen: navy brand area, form on a sheet. */}
      <section
        className="flex items-center bg-surface px-4 py-16 sm:px-6 lg:px-16 standalone:max-lg:min-h-dvh standalone:max-lg:flex-col standalone:max-lg:items-stretch standalone:max-lg:bg-deep standalone:max-lg:p-0"
        aria-labelledby="login-title"
      >
        <div className="hidden flex-col items-center px-6 pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-10 text-center text-white standalone:max-lg:flex">
          <Image src={images.logoLight.src} alt="" width={images.logoLight.width} height={images.logoLight.height} className="h-16 w-auto" priority />
          <p className="mt-4 font-heading text-2xl font-semibold tracking-[-0.02em]">{site.name}</p>
          <p className="mt-1 text-sm text-white/60">Online banking</p>
        </div>
        <div className="mx-auto w-full max-w-md standalone:max-lg:max-w-none standalone:max-lg:flex-1 standalone:max-lg:rounded-t-[2rem] standalone:max-lg:bg-surface standalone:max-lg:px-6 standalone:max-lg:pt-9 standalone:max-lg:pb-[calc(env(safe-area-inset-bottom)+2rem)]">
          <h1 id="login-title" className="text-[clamp(2.2rem,4vw,3rem)] leading-[1.05] font-semibold tracking-[-0.035em] standalone:max-lg:text-[1.75rem]">
            Log in to online banking
          </h1>
          <p className="mt-4 text-lg text-slate standalone:max-lg:mt-2 standalone:max-lg:text-base">Use the user ID and password from your account welcome pack.</p>
          {signedOut && (
            <p role="status" className="mt-6 flex items-center gap-2.5 rounded-xl bg-positive/10 px-4 py-3 text-sm text-ink">
              <CircleCheck className="size-4 shrink-0 text-positive" aria-hidden />
              You’ve logged out. Close this window if you’re on a shared computer.
            </p>
          )}

          <div className="mt-10 standalone:max-lg:mt-8">
            <LoginForm />
          </div>

          <div className="mt-10 space-y-4 border-t border-line pt-8 text-sm leading-relaxed text-slate">
            <p>
              <span className="font-semibold text-ink">Forgotten your user ID or password?</span> For your security we
              reset login details by phone. Call{" "}
              <a href={site.phoneHref} className="font-semibold text-ink underline underline-offset-4 hover:text-amber-ink">
                {site.phone}
              </a>
              .
            </p>
            <p>
              <span className="font-semibold text-ink">Not a customer yet?</span> Accounts are opened in person or by
              phone.{" "}
              <Link href="/contact#open-account" className="font-semibold text-ink underline underline-offset-4 hover:text-amber-ink">
                Arrange your account opening
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <aside className="relative hidden overflow-hidden bg-deep px-16 py-20 text-white lg:flex lg:flex-col lg:justify-center">
        <div className="relative w-full max-w-sm">
          {/* orbit sized to the card so it never crosses the reminders below */}
          <DrawnOrbit
            className="pointer-events-none absolute top-1/2 left-1/2 w-[150%] -translate-x-1/2 -translate-y-1/2 overflow-visible"
            viewBox="0 0 600 360"
            cy={180}
            rx={280}
            ry={120}
            length={0.74}
          />
          <Reveal y={40} className="relative -rotate-6">
            <CardVisual />
          </Reveal>
        </div>
        <div className="relative mt-24 max-w-md">
          <h2 className="flex items-center gap-2.5 text-xl font-semibold">
            <ShieldCheck className="size-6 text-amber" aria-hidden />
            Before you log in
          </h2>
          <RevealGroup as="ul" stagger={0.1} className="mt-5 space-y-3.5 text-white/75">
            {reminders.map((r) => (
              <RevealItem as="li" key={r} className="flex gap-3 leading-relaxed">
                <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-amber" aria-hidden />
                {r}
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </aside>
    </div>
  );
}
