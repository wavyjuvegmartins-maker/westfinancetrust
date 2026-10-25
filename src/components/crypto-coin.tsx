import { assetMeta, type CryptoAsset } from "@/lib/crypto";
import { cn } from "@/lib/utils";

// Each coin's own brand colour, so customers recognise it at a glance.
const coinColor: Record<CryptoAsset, string> = { btc: "#f7931a", usdt: "#26a17b", usdc: "#2775ca", xrp: "#23292f" };
const coinGlyph: Record<CryptoAsset, string> = { btc: "₿", usdt: "₮", usdc: "$", xrp: "✕" };

/** Round coin badge used in online banking and the staff area. */
export function CryptoCoin({ asset, className }: { asset: CryptoAsset; className?: string }) {
  return (
    <span
      aria-hidden
      title={assetMeta[asset].name}
      className={cn("flex size-10 shrink-0 items-center justify-center rounded-full font-heading text-lg font-semibold text-white ring-1 ring-white/20", className)}
      style={{ background: coinColor[asset] }}
    >
      {coinGlyph[asset]}
    </span>
  );
}
