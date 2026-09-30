"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Briefcase, CreditCard, UserRound, type LucideIcon } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { CheckList } from "@/components/check-list";
import { Section, SectionIntro } from "@/components/section";
import { images } from "@/lib/images";
import { cn } from "@/lib/utils";

type Tab = {
  id: string;
  label: string;
  icon: LucideIcon;
  title: string;
  body: string;
  points: string[];
  href: string;
  cta: string;
  image: (typeof images)[keyof typeof images];
  imageClass: string;
};

const tabs: Tab[] = [
  {
    id: "personal",
    label: "Personal",
    icon: UserRound,
    title: "Everyday banking without everyday fees",
    body: "A checking account for the money you spend and a savings account that pays you properly for the money you don’t.",
    points: [
      "No monthly maintenance fee on Everyday Checking",
      "Deposit checks by photo in online banking",
      "Instant transfers between your accounts",
      "Schedule bills and recurring payments",
    ],
    href: "/personal",
    cta: "Explore personal banking",
    image: images.mobileBankingWoman,
    imageClass: "object-cover",
  },
  {
    id: "business",
    label: "Business",
    icon: Briefcase,
    title: "Accounts that keep pace with your business",
    body: "Business checking, card acceptance and payments, run by a relationship manager who knows your name.",
    points: [
      "Take card payments in store and online",
      "Give your team access with their own permissions",
      "Pay suppliers and payroll in batches",
      "Export statements straight to your accountant",
    ],
    href: "/business",
    cta: "Explore business banking",
    image: images.posTerminal,
    imageClass: "object-contain p-[12%]",
  },
  {
    id: "cards",
    label: "Cards",
    icon: CreditCard,
    title: "A card you control from your phone",
    body: "Your debit card arrives with your account, and every setting that matters sits in online banking.",
    points: [
      "Freeze and unfreeze your card in one tap",
      "Get an alert the moment your card is used",
      "Contactless and mobile wallet ready",
      "Order a replacement without calling anyone",
    ],
    href: "/cards",
    cta: "Explore cards",
    image: images.cardWomanWhite,
    imageClass: "object-cover object-[center_32%]",
  },
];

export function AccountTabs() {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tab = tabs[active];

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (active + step + tabs.length) % tabs.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <Section tone="paper" aria-labelledby="accounts-title">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <SectionIntro id="accounts-title" title="One login for everything you bank">
          Accounts, cards and payments sit side by side in online banking, so you see the whole picture and act on it
          in seconds.
        </SectionIntro>

        <div role="tablist" aria-label="Banking for" onKeyDown={onKeyDown} className="inline-flex self-start rounded-full bg-surface p-1 ring-1 ring-line lg:self-auto">
          {tabs.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={i === active}
              aria-controls={`panel-${t.id}`}
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
              className={cn(
                "relative flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors sm:px-5",
                i === active ? "text-surface" : "text-slate hover:text-ink",
              )}
            >
              {i === active && (
                <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", bounce: 0.15, duration: 0.5 }} />
              )}
              <t.icon className="relative size-4" aria-hidden />
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-12">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab.id}
            role="tabpanel"
            id={`panel-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-[#eef2f7] ring-1 ring-line">
              <Image
                src={tab.image.src}
                alt={tab.image.alt}
                fill
                sizes="(min-width: 1024px) 560px, 100vw"
                className={tab.imageClass}
              />
            </div>
            <div>
              <h3 className="text-[clamp(1.6rem,3vw,2.2rem)] leading-tight font-semibold tracking-[-0.025em]">{tab.title}</h3>
              <p className="mt-4 text-lg leading-relaxed text-slate">{tab.body}</p>
              <CheckList items={tab.points} className="mt-7" />
              <ButtonLink href={tab.href} variant="outline-ink" size="md" className="mt-9">
                {tab.cta}
                <ArrowRight aria-hidden />
              </ButtonLink>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </Section>
  );
}
