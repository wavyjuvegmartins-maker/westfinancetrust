import type { Metadata } from "next";
import { MoveView } from "@/components/dashboard/move-view";

export const metadata: Metadata = { title: "Move money" };

export default function Page() {
  return <MoveView />;
}
