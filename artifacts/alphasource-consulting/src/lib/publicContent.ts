import publicSiteContent from "@/lib/publicSiteContent.json";

export type PublicFaqItem = {
  question: string;
  answer: string;
};

export type PublicFaqSection = {
  title: string;
  intro: string;
  items: PublicFaqItem[];
};

export type PublicTeamMember = {
  name: string;
  role: string;
  photo: string;
  width: number;
  height: number;
  bio: string;
  linkedIn: string;
};

export const publicFaqSections = publicSiteContent.publicFaqSections as PublicFaqSection[];

export const publicFaqItems = publicFaqSections.flatMap((section) => section.items);
const publicFaqByQuestion = new Map(publicFaqItems.map((item) => [item.question, item]));
export const publicHomeFaqItems = publicSiteContent.homeFaqQuestions.map((question) => {
  const item = publicFaqByQuestion.get(question);
  if (!item) throw new Error(`Missing configured homepage FAQ: ${question}`);
  return item;
});
export const publicSupportQuestions = publicSiteContent.publicSupportQuestions as PublicFaqItem[];
export const practiceReviewFaqItems = publicSiteContent.practiceReviewFaqItems as PublicFaqItem[];
export const publicTeamMembers = publicSiteContent.teamMembers as PublicTeamMember[];

export function publicRouteModifiedIso(path: string): string {
  const normalized = path.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  return publicSiteContent.routeLastModified[normalized as keyof typeof publicSiteContent.routeLastModified]
    || publicSiteContent.routeLastModified["/"];
}

export function publicRouteModifiedDisplay(path: string): string {
  const [year, month, day] = publicRouteModifiedIso(path).split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export const publicSupportTopics = [
  {
    title: "Getting started",
    body:
      "Questions about fit, consultation requests, engagement options, or the Practice Opportunity Review.",
    links: [
      { label: "How it works", href: "/how-it-works" },
      { label: "Practice Opportunity Review", href: "/practice-opportunity-review" },
    ],
  },
  {
    title: "Agreements",
    body:
      "Help locating a signature request, resolving an unavailable signer link, or retrieving a completed agreement.",
    links: [{ label: "Security and data handling", href: "/security" }],
  },
  {
    title: "Billing",
    body:
      "Help with an existing Stripe Checkout link, offer details, recurring terms, or payment confirmation.",
    links: [{ label: "Consulting services", href: "/dental-consulting" }],
  },
  {
    title: "Secure file transfer",
    body:
      "Help with a team-issued Secure Upload request. Do not send PHI, confidential files, passwords, or access tokens by email.",
    links: [{ label: "Security and data handling", href: "/security" }],
  },
  {
    title: "Analysis and reports",
    body:
      "Questions about approved file types, analysis status, consultant review, or an existing PDF report.",
    links: [
      { label: "Dental Operations Analyzer", href: "/analyzer" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Dental groups",
    body:
      "Questions about multi-location scope, leadership reporting, location comparisons, or ongoing advisory support.",
    links: [{ label: "For dental groups", href: "/for-dental-groups" }],
  },
];
