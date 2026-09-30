import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { images } from "@/lib/images";
import { site } from "@/lib/site";

type LogoProps = { tone?: "auto" | "light"; className?: string };

/** `auto` follows the theme; `light` is for navy backgrounds in either theme. */
export function Logo({ tone = "auto", className }: LogoProps) {
  const markProps = { width: images.logo.width, height: images.logo.height, priority: true };
  return (
    <Link
      href="/"
      className={cn("flex shrink-0 items-center gap-2.5 rounded-md", className)}
      aria-label={`${site.name} home`}
    >
      {tone === "light" ? (
        <Image src={images.logoLight.src} alt="" {...markProps} className="h-9 w-auto" />
      ) : (
        <>
          <Image src={images.logo.src} alt="" {...markProps} className="h-9 w-auto dark:hidden" />
          <Image src={images.logoLight.src} alt="" {...markProps} className="hidden h-9 w-auto dark:block" />
        </>
      )}
      <span
        className={cn(
          "font-heading text-[1.05rem] leading-none font-semibold tracking-[-0.02em]",
          tone === "light" ? "text-white" : "text-ink",
        )}
      >
        West Finance <span className="font-medium">Trust</span>
      </span>
    </Link>
  );
}
