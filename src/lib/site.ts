// Site-wide details. Replace the contact placeholders with the bank's real details.
export const site = {
  name: "West Finance Trust",
  description:
    "Checking, savings and cards you open in person and manage online. Low-rate loans are coming soon.",
  // The bank's web address. Note the spelling: "finace", without the second n.
  // Customers are told to check for exactly this, so keep it in one place.
  domain: "westfinacetrust.com",
  phone: "+1 (800) 555-0142", // TODO: real support number
  phoneHref: "tel:+18005550142",
  email: "support@westfinacetrust.com", // TODO: no inbox yet, needs email hosting or forwarding
  hours: [
    { days: "Monday to Friday", time: "8:00 am to 8:00 pm" },
    { days: "Saturday", time: "9:00 am to 2:00 pm" },
  ],
  branch: {
    name: "Main branch",
    lines: ["100 West Avenue, Suite 200", "Your City, ST 00000"], // TODO: real branch address
  },
} as const;

export type NavItem = { href: string; label: string; soon?: boolean };

export const nav: NavItem[] = [
  { href: "/personal", label: "Personal" },
  { href: "/business", label: "Business" },
  { href: "/cards", label: "Cards" },
  { href: "/loans", label: "Loans", soon: true },
  { href: "/security", label: "Security" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];
