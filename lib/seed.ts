import type { Company, QKey, Rating, CompanyLinks } from "./types";

const grad = (a: string, b: string) => `linear-gradient(135deg,${a},${b})`;

// ⚠️  PROFILE DATA IS HAND-FILLED FROM PUBLIC KNOWLEDGE and may be out of date
//     (valuations, funding and headcount move fast). VERIFY before any public
//     launch — see LAUNCH_CHECKLIST.md.
//
// Base seed: 18 well-known startups. Value Elo is the base; Growth and Workplace
// are derived with believable divergence so the three tables tell different stories.
interface Seed {
  n: string; // name
  d: string; // domain / website
  cat: string;
  reg: string;
  st: "Growth" | "Late";
  b: string; // one-line blurb
  e: number; // base (Value) Elo
  g: number; // games played
  c: string; // gradient fallback
  desc: string; // longer description
  founded: number;
  hq: string;
  emp: string; // headcount range
  funding: string; // total raised
  val: string; // latest valuation
  fo: string[]; // founders
  tags: string[];
  xh?: string; // X/Twitter handle
  lih?: string; // LinkedIn company slug
  cbh?: string; // Crunchbase org slug
}

const SEED: Seed[] = [
  {
    n: "OpenAI", d: "openai.com", cat: "AI Infra", reg: "US", st: "Late",
    b: "Frontier AI models & ChatGPT.", e: 1720, g: 64, c: grad("#22c9a0", "#37b6ff"),
    desc: "Creator of ChatGPT and the GPT family of models. OpenAI builds general-purpose AI systems and delivers them through ChatGPT and a developer API.",
    founded: 2015, hq: "San Francisco, USA", emp: "1,001–5,000", funding: "$60B+", val: "$300B",
    fo: ["Sam Altman", "Greg Brockman", "Ilya Sutskever", "Elon Musk", "Wojciech Zaremba"],
    tags: ["Artificial Intelligence", "Generative AI", "Machine Learning", "Research"],
    xh: "OpenAI", lih: "openai", cbh: "openai",
  },
  {
    n: "Stripe", d: "stripe.com", cat: "Fintech", reg: "US", st: "Late",
    b: "Payments infrastructure for the internet.", e: 1695, g: 71, c: grad("#0eb6a6", "#37b6ff"),
    desc: "Financial infrastructure for the internet. Stripe's APIs power online payments and money movement for businesses from startups to global enterprises.",
    founded: 2010, hq: "San Francisco, USA & Dublin, Ireland", emp: "5,001–10,000", funding: "$9.4B", val: "$91.5B",
    fo: ["Patrick Collison", "John Collison"],
    tags: ["Fintech", "Payments", "Developer Tools", "Infrastructure"],
    xh: "stripe", lih: "stripe", cbh: "stripe",
  },
  {
    n: "Anthropic", d: "anthropic.com", cat: "AI Infra", reg: "US", st: "Late",
    b: "Safety-first frontier AI (Claude).", e: 1668, g: 52, c: grad("#ff8a5c", "#ffb638"),
    desc: "AI safety company and creator of Claude, a family of frontier language models built with a focus on reliability, steerability and interpretability.",
    founded: 2021, hq: "San Francisco, USA", emp: "1,001–5,000", funding: "$18B+", val: "$183B",
    fo: ["Dario Amodei", "Daniela Amodei", "Jared Kaplan", "Tom Brown"],
    tags: ["Artificial Intelligence", "AI Safety", "Generative AI", "Research"],
    xh: "AnthropicAI", lih: "anthropicresearch", cbh: "anthropic",
  },
  {
    n: "SpaceX", d: "spacex.com", cat: "Hardware", reg: "US", st: "Late",
    b: "Rockets, Starlink & orbital internet.", e: 1712, g: 58, c: grad("#37b6ff", "#0eb6a6"),
    desc: "Designs, manufactures and launches rockets and spacecraft, and operates Starlink, a global satellite-internet constellation.",
    founded: 2002, hq: "Hawthorne, California, USA", emp: "10,001+", funding: "$10B+", val: "$350B",
    fo: ["Elon Musk"],
    tags: ["Aerospace", "Space", "Satellites", "Hardware"],
    xh: "SpaceX", lih: "spacex", cbh: "space-exploration-technologies",
  },
  {
    n: "Databricks", d: "databricks.com", cat: "AI Infra", reg: "US", st: "Late",
    b: "Data + AI lakehouse platform.", e: 1610, g: 44, c: grad("#ff6b8b", "#ff8a5c"),
    desc: "The data and AI 'lakehouse' platform. Databricks unifies data engineering, analytics and machine learning on a single cloud platform.",
    founded: 2013, hq: "San Francisco, USA", emp: "5,001–10,000", funding: "$14B+", val: "$62B",
    fo: ["Ali Ghodsi", "Matei Zaharia", "Ion Stoica", "Reynold Xin"],
    tags: ["Data", "Artificial Intelligence", "Analytics", "Cloud"],
    xh: "databricks", lih: "databricks", cbh: "databricks",
  },
  {
    n: "Canva", d: "canva.com", cat: "Consumer", reg: "APAC", st: "Late",
    b: "Design for everyone, in the browser.", e: 1552, g: 39, c: grad("#37b6ff", "#22c9a0"),
    desc: "A drag-and-drop online design platform used by individuals and teams to create graphics, presentations, videos and marketing materials.",
    founded: 2013, hq: "Sydney, Australia", emp: "1,001–5,000", funding: "$580M", val: "$32B",
    fo: ["Melanie Perkins", "Cliff Obrecht", "Cameron Adams"],
    tags: ["Design", "SaaS", "Consumer", "Creative Tools"],
    xh: "canva", lih: "canva", cbh: "canva",
  },
  {
    n: "Ramp", d: "ramp.com", cat: "Fintech", reg: "US", st: "Growth",
    b: "Corporate cards & spend management.", e: 1534, g: 28, c: grad("#8fd93a", "#22c9a0"),
    desc: "A corporate card and spend-management platform that helps companies control expenses and automate finance operations.",
    founded: 2019, hq: "New York, USA", emp: "1,001–5,000", funding: "$1.4B", val: "$22.5B",
    fo: ["Eric Glyman", "Karim Atiyeh"],
    tags: ["Fintech", "Corporate Cards", "Spend Management", "SaaS"],
    xh: "tryramp", lih: "ramp", cbh: "ramp",
  },
  {
    n: "Vercel", d: "vercel.com", cat: "Dev Tools", reg: "US", st: "Growth",
    b: "Frontend cloud & Next.js.", e: 1508, g: 22, c: grad("#1c1a2e", "#7b7893"),
    desc: "The frontend cloud. Vercel makes it easy to deploy and scale web apps, and is the company behind the Next.js framework.",
    founded: 2015, hq: "San Francisco, USA", emp: "201–500", funding: "$563M", val: "$3.25B",
    fo: ["Guillermo Rauch"],
    tags: ["Developer Tools", "Cloud", "Frontend", "Infrastructure"],
    xh: "vercel", lih: "vercel", cbh: "vercel",
  },
  {
    n: "Figma", d: "figma.com", cat: "SaaS", reg: "US", st: "Late",
    b: "Collaborative interface design.", e: 1571, g: 41, c: grad("#ff6b8b", "#0eb6a6"),
    desc: "A collaborative, browser-based interface design tool. Figma lets teams design, prototype and ship products together in real time. (Public: NYSE: FIG.)",
    founded: 2012, hq: "San Francisco, USA", emp: "1,001–5,000", funding: "$333M", val: "~$60B (public)",
    fo: ["Dylan Field", "Evan Wallace"],
    tags: ["Design", "SaaS", "Collaboration", "Creative Tools"],
    xh: "figma", lih: "figma", cbh: "figma",
  },
  {
    n: "Notion", d: "notion.so", cat: "SaaS", reg: "US", st: "Growth",
    b: "Docs, wikis & the connected workspace.", e: 1499, g: 33, c: grad("#7b7893", "#1c1a2e"),
    desc: "An all-in-one connected workspace for notes, docs, wikis, projects and lightweight databases.",
    founded: 2013, hq: "San Francisco, USA", emp: "501–1,000", funding: "$343M", val: "$10B",
    fo: ["Ivan Zhao", "Simon Last"],
    tags: ["Productivity", "SaaS", "Collaboration", "Note-taking"],
    xh: "NotionHQ", lih: "notionhq", cbh: "notion-so",
  },
  {
    n: "Perplexity", d: "perplexity.ai", cat: "AI Infra", reg: "US", st: "Growth",
    b: "AI answer engine for the web.", e: 1523, g: 19, c: grad("#37b6ff", "#8fd93a"),
    desc: "An AI-powered answer engine that responds to questions with cited, real-time information gathered from across the web.",
    founded: 2022, hq: "San Francisco, USA", emp: "51–200", funding: "$1B+", val: "$18B",
    fo: ["Aravind Srinivas", "Denis Yarats", "Johnny Ho", "Andy Konwinski"],
    tags: ["Artificial Intelligence", "Search", "Generative AI", "Consumer"],
    xh: "perplexity_ai", lih: "perplexity-ai", cbh: "perplexity-ai",
  },
  {
    n: "Retool", d: "retool.com", cat: "Dev Tools", reg: "US", st: "Growth",
    b: "Build internal tools fast.", e: 1462, g: 16, c: grad("#0eb6a6", "#ff6b8b"),
    desc: "A development platform for quickly building internal tools and business apps on top of your existing data and APIs.",
    founded: 2017, hq: "San Francisco, USA", emp: "201–500", funding: "$141M", val: "$3.2B",
    fo: ["David Hsu"],
    tags: ["Developer Tools", "Internal Tools", "SaaS", "Low-code"],
    xh: "retool", lih: "retool", cbh: "retool",
  },
  {
    n: "Rippling", d: "rippling.com", cat: "SaaS", reg: "US", st: "Growth",
    b: "HR, IT & finance in one system.", e: 1487, g: 24, c: grad("#22c9a0", "#8fd93a"),
    desc: "A workforce-management platform unifying HR, IT and finance — payroll, benefits, devices and apps — in a single system.",
    founded: 2016, hq: "San Francisco, USA", emp: "1,001–5,000", funding: "$1.5B+", val: "$16.8B",
    fo: ["Parker Conrad", "Prasanna Sankar"],
    tags: ["HR", "Fintech", "SaaS", "IT Management"],
    xh: "Rippling", lih: "rippling", cbh: "rippling",
  },
  {
    n: "Deel", d: "deel.com", cat: "Fintech", reg: "US", st: "Growth",
    b: "Global payroll & compliance.", e: 1471, g: 21, c: grad("#ffb638", "#ff8a5c"),
    desc: "A global payroll and compliance platform that lets companies hire, pay and manage employees and contractors in 150+ countries.",
    founded: 2019, hq: "San Francisco, USA", emp: "1,001–5,000", funding: "$1.1B+", val: "$12.6B",
    fo: ["Alex Bouaziz", "Shuo Wang"],
    tags: ["Fintech", "HR", "Global Payroll", "SaaS"],
    xh: "deel", lih: "deel", cbh: "deel",
  },
  {
    n: "Wiz", d: "wiz.io", cat: "SaaS", reg: "Israel", st: "Growth",
    b: "Cloud security, fastest to $100M ARR.", e: 1544, g: 18, c: grad("#37b6ff", "#0eb6a6"),
    desc: "A cloud-security platform that scans cloud environments for risk. Wiz reached $100M ARR faster than any prior startup and agreed to be acquired by Google.",
    founded: 2020, hq: "New York, USA & Tel Aviv, Israel", emp: "1,001–5,000", funding: "$1.9B", val: "$32B",
    fo: ["Assaf Rappaport", "Ami Luttwak", "Yinon Costica", "Roy Reznik"],
    tags: ["Cybersecurity", "Cloud Security", "SaaS", "Enterprise"],
    xh: "wiz_io", lih: "wizsecurity", cbh: "wiz-2",
  },
  {
    n: "Mistral", d: "mistral.ai", cat: "AI Infra", reg: "Europe", st: "Growth",
    b: "Open-weight European AI models.", e: 1516, g: 14, c: grad("#ff6b8b", "#ffb638"),
    desc: "A European AI lab building efficient open-weight and commercial large language models.",
    founded: 2023, hq: "Paris, France", emp: "51–200", funding: "$1.1B+", val: "$14B",
    fo: ["Arthur Mensch", "Guillaume Lample", "Timothée Lacroix"],
    tags: ["Artificial Intelligence", "Open Source", "Generative AI", "Europe"],
    xh: "MistralAI", lih: "mistralai", cbh: "mistral-ai",
  },
  {
    n: "Revolut", d: "revolut.com", cat: "Fintech", reg: "Europe", st: "Late",
    b: "All-in-one financial super-app.", e: 1558, g: 31, c: grad("#0eb6a6", "#37b6ff"),
    desc: "A financial super-app offering banking, currency exchange, cards, investing and more to tens of millions of users worldwide.",
    founded: 2015, hq: "London, UK", emp: "5,001–10,000", funding: "$2B+", val: "$45B",
    fo: ["Nikolay Storonsky", "Vlad Yatsenko"],
    tags: ["Fintech", "Neobank", "Payments", "Consumer"],
    xh: "RevolutApp", lih: "revolut", cbh: "revolut",
  },
  {
    n: "Nubank", d: "nubank.com.br", cat: "Fintech", reg: "LatAm", st: "Late",
    b: "Digital banking for Latin America.", e: 1540, g: 27, c: grad("#0a8f93", "#ff6b8b"),
    desc: "Latin America's largest digital bank, serving 100M+ customers across Brazil, Mexico and Colombia. (Public: NYSE: NU.)",
    founded: 2013, hq: "São Paulo, Brazil", emp: "5,001–10,000", funding: "$4B+", val: "~$60B (public)",
    fo: ["David Vélez", "Cristina Junqueira", "Edward Wible"],
    tags: ["Fintech", "Neobank", "Banking", "LatAm"],
    xh: "nubank", lih: "nubank", cbh: "nubank",
  },
];

function rating(elo: number, games: number): Rating {
  return { elo, games, weekMovement: 0, seasonStart: elo };
}

// Self-hosted logo path (see scripts/fetch-logos.ts). Slug = first label of the
// domain (openai.com -> openai), which is unique across the seed set.
export function logoSlug(website: string): string {
  return website.split(".")[0];
}

function links(s: Seed): CompanyLinks {
  return {
    x: s.xh ? `https://x.com/${s.xh}` : undefined,
    linkedin: s.lih ? `https://www.linkedin.com/company/${s.lih}` : undefined,
    crunchbase: s.cbh ? `https://www.crunchbase.com/organization/${s.cbh}` : undefined,
  };
}

export function buildCompanies(): Company[] {
  return SEED.map((s, i) => {
    const gOff =
      (s.st === "Growth" ? 45 : -20) +
      (s.cat === "AI Infra" ? 30 : s.cat === "Consumer" ? 15 : 0) +
      (i % 5) * 3;
    const dOff =
      (s.st === "Late" ? 45 : -15) +
      (s.cat === "Hardware" ? 45 : s.cat === "AI Infra" ? 8 : s.cat === "Fintech" ? 22 : s.cat === "Dev Tools" ? 12 : 0) -
      (s.cat === "Consumer" ? 20 : 0) -
      (i % 4) * 5;
    const ratings: Record<QKey, Rating> = {
      V: rating(s.e, s.g),
      G: rating(s.e + gOff, s.g),
      D: rating(s.e + dOff, s.g),
    };
    return {
      id: i,
      name: s.n,
      website: s.d,
      category: s.cat,
      region: s.reg,
      stage: s.st,
      blurb: s.b,
      gradient: s.c,
      ratings,
      logoUrl: `/logos/${logoSlug(s.d)}.png`,
      description: s.desc,
      foundedYear: s.founded,
      headquarters: s.hq,
      employees: s.emp,
      totalFunding: s.funding,
      valuation: s.val,
      founders: s.fo,
      tags: s.tags,
      links: links(s),
    };
  });
}
