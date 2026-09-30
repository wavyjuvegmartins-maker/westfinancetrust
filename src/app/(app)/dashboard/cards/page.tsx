import type { Metadata } from "next";
import { CardsView } from "@/components/dashboard/cards-view";

export const metadata: Metadata = { title: "Cards" };

export default function Page() {
  return <CardsView />;
}
