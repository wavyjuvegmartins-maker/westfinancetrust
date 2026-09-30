// Brand and marketing imagery, served from /public/images.
// Sources live in assets/originals; regenerate with `node scripts/process-images.mjs`.
export const images = {
  logo: { src: "/images/logo.webp", width: 336, height: 344, alt: "West Finance Trust" },
  logoLight: { src: "/images/logo-light.webp", width: 336, height: 344, alt: "West Finance Trust" },
  bankIllustration: { src: "/images/bank-illustration.webp", width: 736, height: 736, alt: "Illustration of a man carrying a money bag toward a bank" },
  cardWomanWhite: { src: "/images/card-woman-white.webp", width: 736, height: 1104, alt: "Woman resting her hand on an oversized white payment card" },
  cryptoCoins: { src: "/images/crypto-coins.webp", width: 735, height: 588, alt: "Metallic cryptocurrency coins on a dark background" },
  everyDollar: { src: "/images/every-dollar.webp", width: 736, height: 368, alt: "Eyes of a banknote portrait seen through torn red paper" },
  growthCoinStacks: { src: "/images/growth-coin-stacks.webp", width: 736, height: 1104, alt: "Rising stacks of coins with a glowing upward arrow" },
  mobileBankingWoman: { src: "/images/mobile-banking-woman.webp", width: 735, height: 490, alt: "Smiling woman paying with her phone and card" },
  moneyRoad: { src: "/images/money-road.webp", width: 672, height: 672, alt: "Man in a suit walking along a road made of banknotes" },
  phoneReceipt: { src: "/images/phone-receipt.webp", width: 626, height: 560, alt: "Smartphone with a paper receipt flowing from its screen" },
  posTerminal: { src: "/images/pos-terminal.webp", width: 294, height: 294, alt: "Card payment terminal showing an approved checkmark" },
  savingsJar: { src: "/images/savings-jar.webp", width: 736, height: 920, alt: "Hand holding a glass jar full of gold coins" },
  securityLock: { src: "/images/security-lock.webp", width: 736, height: 589, alt: "Glass padlock resting on a smartphone screen" },
  walletHand: { src: "/images/wallet-hand.webp", width: 736, height: 920, alt: "Hand holding a green wallet above a receipt" },
} as const;

export type ImageKey = keyof typeof images;
