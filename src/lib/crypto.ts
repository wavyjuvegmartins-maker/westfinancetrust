// The coins we hold and the networks each can arrive on. Shared by the staff
// tools and online banking. The database checks the same rules again
// (crypto_address_problem in supabase/migrations/20261025000001_crypto.sql).

export const cryptoAssets = ["btc", "usdt", "usdc", "xrp"] as const;
export type CryptoAsset = (typeof cryptoAssets)[number];

export const cryptoNetworks = ["bitcoin", "xrpl", "ethereum", "tron", "solana", "bsc", "polygon", "base"] as const;
export type CryptoNetwork = (typeof cryptoNetworks)[number];

export const assetMeta: Record<CryptoAsset, { symbol: string; name: string; decimals: number; networks: readonly CryptoNetwork[] }> = {
  btc: { symbol: "BTC", name: "Bitcoin", decimals: 8, networks: ["bitcoin"] },
  usdt: { symbol: "USDT", name: "Tether", decimals: 6, networks: ["ethereum", "tron", "solana", "bsc"] },
  usdc: { symbol: "USDC", name: "USD Coin", decimals: 6, networks: ["ethereum", "solana", "polygon", "base"] },
  xrp: { symbol: "XRP", name: "XRP", decimals: 6, networks: ["xrpl"] },
};

export const networkLabel: Record<CryptoNetwork, string> = {
  bitcoin: "Bitcoin",
  xrpl: "XRP Ledger",
  ethereum: "Ethereum (ERC-20)",
  tron: "Tron (TRC-20)",
  solana: "Solana (SPL)",
  bsc: "BNB Smart Chain (BEP-20)",
  polygon: "Polygon",
  base: "Base",
};

const base58 = "1-9A-HJ-NP-Za-km-z";
const addressPattern: Record<CryptoNetwork, RegExp> = {
  bitcoin: new RegExp(`^(bc1[02-9ac-hj-np-z]{11,71}|[13][${base58}]{25,34})$`),
  xrpl: new RegExp(`^r[${base58}]{24,34}$`),
  tron: new RegExp(`^T[${base58}]{33}$`),
  solana: new RegExp(`^[${base58}]{32,44}$`),
  ethereum: /^0x[0-9a-fA-F]{40}$/,
  bsc: /^0x[0-9a-fA-F]{40}$/,
  polygon: /^0x[0-9a-fA-F]{40}$/,
  base: /^0x[0-9a-fA-F]{40}$/,
};

/** What's wrong with an address, or null if it looks right for the coin and network. */
export function cryptoAddressProblem(asset: CryptoAsset, network: string, address: string, tag?: string | null) {
  if (!(assetMeta[asset].networks as readonly string[]).includes(network)) return `${assetMeta[asset].symbol} can’t be sent on that network.`;
  if (!addressPattern[network as CryptoNetwork].test(address)) return "That address isn’t valid for the network chosen. Check it character by character.";
  if (tag) {
    if (network !== "xrpl") return "Only XRP addresses take a destination tag.";
    if (!/^\d{1,10}$/.test(tag) || Number(tag) > 4_294_967_295) return "XRP destination tags are a number up to 4294967295.";
  }
  return null;
}

/** Up to the coin's decimal places, never in exponent form: "0.015", "1,250.5". */
export function formatCrypto(amount: number, asset: CryptoAsset, { symbol = true } = {}) {
  const text = amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: assetMeta[asset].decimals });
  return symbol ? `${text} ${assetMeta[asset].symbol}` : text;
}

/** True when the amount has no more decimal places than the coin allows. */
export const fitsDecimals = (amount: number, asset: CryptoAsset) => Number(amount.toFixed(assetMeta[asset].decimals)) === amount;

/** Long addresses shortened for lists: bc1qxy…0wlh. The full one is always shown where it's copied. */
export const shortAddress = (address: string) => (address.length > 16 ? `${address.slice(0, 8)}…${address.slice(-6)}` : address);

export type CryptoWallet = {
  asset: CryptoAsset;
  balance: number;
  deposit: { address: string; network: CryptoNetwork; tag: string | null } | null;
  withdrawal: { address: string; network: CryptoNetwork; tag: string | null } | null;
};

export type CryptoTxn = {
  id: string;
  asset: CryptoAsset;
  kind: "deposit" | "withdrawal";
  status: "pending" | "completed" | "declined";
  amount: number;
  description: string;
  note: string | null;
  address: string | null;
  network: CryptoNetwork | null;
  tag: string | null;
  reference: string;
  declineReason: string | null;
  date: string;
  reviewedAt: string | null;
};

/** Database rows, as both the dashboard and staff pages read them. */
export type CryptoWalletRow = {
  asset: CryptoAsset;
  balance: string | number;
  deposit_address: string | null;
  deposit_network: CryptoNetwork | null;
  deposit_tag: string | null;
  withdrawal_address: string | null;
  withdrawal_network: CryptoNetwork | null;
  withdrawal_tag: string | null;
  updated_at?: string;
};

export type CryptoTxnRow = {
  id: string;
  asset: CryptoAsset;
  kind: "deposit" | "withdrawal";
  status: "pending" | "completed" | "declined";
  amount: string | number;
  description: string;
  note: string | null;
  address: string | null;
  network: CryptoNetwork | null;
  tag: string | null;
  reference: string;
  decline_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
};

/** Every coin, in a fixed order, whether or not the customer has a wallet row for it yet. */
export function toWallets(rows: CryptoWalletRow[]): CryptoWallet[] {
  return cryptoAssets.map((asset) => {
    const r = rows.find((w) => w.asset === asset);
    return {
      asset,
      balance: Number(r?.balance ?? 0),
      deposit: r?.deposit_address && r.deposit_network ? { address: r.deposit_address, network: r.deposit_network, tag: r.deposit_tag } : null,
      withdrawal:
        r?.withdrawal_address && r.withdrawal_network ? { address: r.withdrawal_address, network: r.withdrawal_network, tag: r.withdrawal_tag } : null,
    };
  });
}

export const toCryptoTxn = (t: CryptoTxnRow): CryptoTxn => ({
  id: t.id,
  asset: t.asset,
  kind: t.kind,
  status: t.status,
  amount: Number(t.amount),
  description: t.description,
  note: t.note,
  address: t.address,
  network: t.network,
  tag: t.tag,
  reference: t.reference,
  declineReason: t.decline_reason,
  date: t.created_at,
  reviewedAt: t.reviewed_at,
});
