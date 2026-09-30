import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { signOut } from "@/app/actions";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { getSessionUser } from "@/lib/auth/session";
import { homeFor } from "@/lib/auth/types";
import { images } from "@/lib/images";

export const metadata: Metadata = {
  title: "Choose your password",
  robots: { index: false, follow: false },
};

export default async function ChangePasswordPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const firstTime = user.mustChangePassword;

  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-2.5">
          <Image src={images.logo.src} alt="" width={images.logo.width} height={images.logo.height} className="h-9 w-auto dark:hidden" priority />
          <Image src={images.logoLight.src} alt="" width={images.logoLight.width} height={images.logoLight.height} className="hidden h-9 w-auto dark:block" priority />
          <span className="font-heading text-[1.05rem] font-semibold tracking-[-0.02em] text-ink">West Finance Trust</span>
        </div>

        <div className="rounded-[1.75rem] bg-panel p-6 ring-1 ring-line sm:p-8">
          <h1 className="font-heading text-2xl font-semibold tracking-[-0.025em] text-ink">
            {firstTime ? `Welcome, ${user.firstName}. Choose your password` : "Change your password"}
          </h1>
          <p className="mt-2 text-slate">
            {firstTime
              ? "The password we emailed you works only once. Choose your own to finish setting up online banking."
              : "Your new password replaces the old one straight away."}
          </p>
          <p className="mt-5 flex items-start gap-2.5 rounded-xl bg-canvas px-4 py-3 text-sm text-slate">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-positive" aria-hidden />
            Don’t reuse a password from another site, and never share it. We’ll never ask for it.
          </p>
          <div className="mt-6">
            <ChangePasswordForm />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between text-sm">
          {firstTime ? (
            <span className="text-slate">Signed in as {user.userId}</span>
          ) : (
            <Link href={homeFor(user)} className="font-semibold text-ink hover:text-amber-ink">
              Back
            </Link>
          )}
          <form action={signOut}>
            <button type="submit" className="font-semibold text-slate hover:text-ink">
              Log out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
