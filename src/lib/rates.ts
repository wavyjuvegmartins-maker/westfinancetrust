// Marketing rates shown across the site. These are placeholders: confirm every
// figure with the bank before launch, and keep the disclosures next to them.
export const savingsApy = 4.1; // % APY, High-Yield Savings
export const certificateApy = 4.5; // % APY, 12-month Certificate
export const businessSavingsApy = 3.6; // % APY, Business Savings

export const ratesNote =
  "Rates shown are for illustration and may change at any time. APY is annual percentage yield. APR is annual percentage rate.";

export type LoanProduct = {
  id: "personal" | "auto" | "home" | "business";
  name: string;
  fromApr: number;
  terms: string;
  amounts: string;
  summary: string;
};

export const loanProducts: LoanProduct[] = [
  {
    id: "personal",
    name: "Personal loan",
    fromApr: 7.49,
    terms: "12 to 60 months",
    amounts: "$2,000 to $50,000",
    summary: "One fixed monthly payment to consolidate debt or cover a big expense.",
  },
  {
    id: "auto",
    name: "Auto loan",
    fromApr: 5.29,
    terms: "24 to 72 months",
    amounts: "$5,000 to $100,000",
    summary: "New or used, from a dealer or a private seller. Refinancing too.",
  },
  {
    id: "home",
    name: "Home loan",
    fromApr: 6.19,
    terms: "15 or 30 years",
    amounts: "Up to $1,500,000",
    summary: "Fixed-rate mortgages for buying or refinancing your home.",
  },
  {
    id: "business",
    name: "Business loan",
    fromApr: 7.99,
    terms: "12 to 120 months",
    amounts: "$10,000 to $500,000",
    summary: "Working capital, equipment and expansion for growing businesses.",
  },
];

export const lowestLoanApr = Math.min(...loanProducts.map((p) => p.fromApr));

export const formatRate = (n: number) => `${n.toFixed(2)}%`;

export const formatMoney = (n: number, cents = true) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
