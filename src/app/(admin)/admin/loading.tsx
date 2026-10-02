import { PageLoader } from "@/components/spinner";

// Between staff pages: keeps the shell, spins while the page queries Supabase.
export default function Loading() {
  return <PageLoader />;
}
