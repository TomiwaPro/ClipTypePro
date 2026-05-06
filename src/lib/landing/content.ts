/**
 * Static landing-page content. Centralised so copy edits don't require
 * touching multiple component files.
 */

export const FAQS = [
  {
    q: "Will ClipType Pro get my account banned?",
    a: "Our Platform Risk Rating system rates 25+ platforms. Red-rated platforms auto-trigger Stealth Mode and show a clear warning. You are always informed before typing on any high-risk platform.",
  },
  {
    q: "Does ClipType store my clipboard content?",
    a: "Never. ClipType Pro uses zero-knowledge local processing — your clipboard data is never sent to our servers. All processing happens entirely on your device.",
  },
  {
    q: "Can it be used during exams or in proctored environments?",
    a: "ClipType automatically detects and disables itself when proctoring software like Respondus, Proctorio, or ExamSoft is running. This is a hard block — it cannot be overridden by the user.",
  },
  {
    q: "Does it work in all applications?",
    a: "ClipType works in virtually any text field on your system. Browser extensions cover web fields; the desktop app covers everything else including terminal, IDEs, and native apps.",
  },
  {
    q: "What is the difference between Human Mode and Stealth Mode?",
    a: "Human Mode adds natural typing variance and occasional self-corrected typos. Stealth Mode (Pro) goes further — using a Gaussian delay distribution modelled on real human typing data, making it statistically indistinguishable from human input.",
  },
  {
    q: "Is there a free trial for Pro?",
    a: "Yes — all new signups get a 14-day Pro trial with no credit card required. You can test every feature before committing to a subscription.",
  },
] as const;

export const HOW_IT_WORKS = [
  {
    n: "01",
    icon: "📋",
    title: "Copy your text",
    desc: "Copy anything to your clipboard — a response, script, code, or document. ClipType detects it instantly.",
  },
  {
    n: "02",
    icon: "⚡",
    title: "Choose your speed",
    desc: "Pick from Human, Balanced, Fast, or Stealth mode depending on where you need to type and how natural it needs to look.",
  },
  {
    n: "03",
    icon: "⌨",
    title: "Click start",
    desc: "Switch to your target field. ClipType counts down and begins typing — character by character, just like a human.",
  },
] as const;

export const FEATURES = [
  { icon: "🎬", title: "Streaming & Content", desc: "Type scripts live on camera — looks authentic, zero fumbling" },
  { icon: "🏥", title: "Healthcare", desc: "Auto-type clinical notes into paste-blocked EHR systems" },
  { icon: "💼", title: "Customer Support", desc: "Agents respond in seconds with snippet library + auto-type" },
  { icon: "👨‍💻", title: "Developers", desc: "Live code demos without the stress — prewritten code, typed live" },
  { icon: "♿", title: "Accessibility", desc: "Motor-impaired users type at full speed via clipboard input" },
  { icon: "⚖️", title: "Legal & Compliance", desc: "Boilerplate clauses typed into secure, paste-blocked systems" },
  { icon: "🎓", title: "Education", desc: "Teachers type lesson content live — looks spontaneous, isn't" },
  { icon: "📞", title: "Call Centres", desc: "Agents type CRM notes without lifting eyes from the call" },
  { icon: "🤖", title: "AI Workflows", desc: "Auto-type complex prompts into ChatGPT, Claude, and more" },
] as const;

export type PricingTier = {
  name: string;
  price: string;
  period: string;
  color: "textDim" | "primary" | "accent" | "warning";
  popular?: boolean;
  features: string[];
  cta: string;
  href: string;
  variant: "ghost" | "primary" | "accent";
};

export const PRICING: PricingTier[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    color: "textDim",
    features: [
      "Unlimited typing",
      "Human + Balanced modes",
      "5 snippets",
      "Single device",
      "Community support",
    ],
    cta: "Get started",
    href: "/signup",
    variant: "ghost",
  },
  {
    name: "Pro",
    price: "$9",
    period: "/month",
    color: "primary",
    popular: true,
    features: [
      "Everything in Free",
      "Stealth + Fast + Instant",
      "Unlimited snippets",
      "3 devices",
      "Window Lock",
      "Per-platform presets",
      "Unicode support",
      "Priority support",
    ],
    cta: "Start 14-day trial",
    href: "/signup?plan=pro",
    variant: "primary",
  },
  {
    name: "Teams",
    price: "$29",
    period: "/seat/month",
    color: "accent",
    features: [
      "Everything in Pro",
      "Team snippet library",
      "Admin dashboard",
      "Audit logs",
      "SSO + Role controls",
      "Compliance Mode",
      "Dedicated manager",
    ],
    cta: "Start free trial",
    href: "/signup?plan=teams",
    variant: "accent",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    color: "warning",
    features: [
      "Everything in Teams",
      "On-premise deploy",
      "SOC 2 + HIPAA BAA",
      "White-label option",
      "Custom integrations",
      "SLA guarantees",
      "24/7 dedicated line",
    ],
    cta: "Contact sales",
    href: "mailto:sales@cliptypepro.com?subject=ClipType%20Pro%20Enterprise%20enquiry",
    variant: "ghost",
  },
];

export const TESTIMONIALS = [
  {
    name: "Dr. Amara Osei",
    role: "NHS GP, London",
    quote:
      "Epic blocks pasting in patient notes. ClipType just works in Stealth mode — saved me hours every week. Absolute game changer.",
    rating: 5,
  },
  {
    name: "James Thornton",
    role: "Senior Dev, Fintech startup",
    quote:
      "I use it for live coding demos on YouTube. Viewers have no idea the code isn't being typed in real time. The Human mode is frighteningly convincing.",
    rating: 5,
  },
  {
    name: "Kezia Mbeki",
    role: "Customer Support Lead",
    quote:
      "Our team's handle time dropped 34% in the first month. The shared snippet library alone was worth the Teams subscription.",
    rating: 5,
  },
] as const;

export const STATS = [
  ["12,400+", "Active Users"],
  ["98.7%", "Detection Avoidance"],
  ["25+", "Platform Ratings"],
  ["4.9★", "Average Rating"],
] as const;

export const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Platforms", href: "#platforms" },
  { label: "API", href: "#api" },
  { label: "Docs", href: "#faq" },
] as const;

export const FOOTER_LINKS = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/tos" },
  { label: "Security", href: "/security" },
  { label: "Status", href: "/status" },
  { label: "About", href: "/about" },
  { label: "Changelog", href: "/changelog" },
] as const;
