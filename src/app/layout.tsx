import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import { AppSplash } from "@/components/app/splash";
import { PwaSetup } from "@/components/app/pwa-setup";
import { Providers } from "@/components/providers";
import { site } from "@/lib/site";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Hanken_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${site.name} | Opened in person. Banked from anywhere.`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || `https://${site.domain}`),
  // Home-screen app on iPhone and iPad (Android reads app/manifest.ts).
  appleWebApp: { capable: true, title: "West Finance", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1222" },
  ],
  // Lets the installed app draw under the notch; layouts pad with env(safe-area-inset-*).
  viewportFit: "cover",
};

// Chrome can offer installation before React has loaded; keep that offer for
// the "Get the app" buttons (picked up in src/lib/pwa.ts).
const catchInstallPrompt = `addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__wftInstallPrompt=e})`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${body.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: catchInstallPrompt }} />
      </head>
      <body className="flex min-h-full flex-col">
        <AppSplash />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-deep focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
        <PwaSetup />
      </body>
    </html>
  );
}
