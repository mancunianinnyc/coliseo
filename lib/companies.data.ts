import type { Stage } from "./types";

// ⚠️  SEED DATASET — hand-compiled from public knowledge as a launch starting
//     point (~250 companies). Facts (especially funding/valuation/headcount)
//     move fast and may be wrong or stale. VERIFY before any public launch, and
//     expect the community to correct + expand this over time (that's the point).
//
// Only `n`, `d`, `cat`, `reg`, `st`, `b`, `p` are required. Everything else is
// optional and simply omitted from the profile when missing — fill only what
// you're confident about.
//
//   p = prominence 1–5 (5 = household name). Seeds a provisional starting Elo;
//       real votes quickly take over.

export interface SeedCompany {
  n: string; // name
  d: string; // domain
  cat: string; // category (free-form; see CATEGORIES)
  reg: string; // region
  st: Stage; // Growth | Late
  b: string; // one-line blurb
  p: number; // prominence 1–5
  desc?: string;
  founded?: number;
  hq?: string;
  emp?: string;
  funding?: string;
  val?: string;
  fo?: string[]; // founders
  tags?: string[];
  xh?: string; // X handle
  lih?: string; // LinkedIn company slug
  cbh?: string; // Crunchbase org slug
}

// The category taxonomy used across the seed (the Submit form + table filters
// derive from these). Free-form in the DB, so new categories are fine.
export const CATEGORIES = [
  "AI",
  "Fintech",
  "Crypto",
  "Dev Tools",
  "Data & Infra",
  "Security",
  "SaaS",
  "Productivity",
  "Consumer",
  "Commerce",
  "Logistics",
  "Health",
  "Bio",
  "Climate",
  "Hardware",
  "Space & Defense",
  "Robotics",
  "Mobility",
  "Proptech",
  "Edtech",
  "Media & Gaming",
] as const;

export const REGIONS = [
  "US",
  "Canada",
  "Europe",
  "Israel",
  "India",
  "APAC",
  "LatAm",
  "MENA",
  "Africa",
  "Other",
] as const;

export const COMPANIES: SeedCompany[] = [
  // ---------------- AI ----------------
  { n: "OpenAI", d: "openai.com", cat: "AI", reg: "US", st: "Late", p: 5, b: "Frontier AI models & ChatGPT.", desc: "Creator of ChatGPT and the GPT family of models. Builds general-purpose AI delivered through ChatGPT and a developer API.", founded: 2015, hq: "San Francisco, USA", emp: "1,001–5,000", funding: "$60B+", val: "$300B", fo: ["Sam Altman", "Greg Brockman", "Ilya Sutskever", "Elon Musk"], tags: ["Artificial Intelligence", "Generative AI", "Research"], xh: "OpenAI", lih: "openai", cbh: "openai" },
  { n: "Anthropic", d: "anthropic.com", cat: "AI", reg: "US", st: "Late", p: 5, b: "Safety-first frontier AI (Claude).", desc: "AI safety company and creator of Claude, a family of frontier language models built for reliability and interpretability.", founded: 2021, hq: "San Francisco, USA", emp: "1,001–5,000", funding: "$18B+", val: "$183B", fo: ["Dario Amodei", "Daniela Amodei", "Jared Kaplan", "Tom Brown"], tags: ["Artificial Intelligence", "AI Safety", "Generative AI"], xh: "AnthropicAI", lih: "anthropicresearch", cbh: "anthropic" },
  { n: "xAI", d: "x.ai", cat: "AI", reg: "US", st: "Late", p: 4, b: "Elon Musk's AI lab, maker of Grok.", founded: 2023, hq: "Palo Alto, USA", fo: ["Elon Musk"], tags: ["Artificial Intelligence", "Generative AI"], xh: "xai", cbh: "x-ai" },
  { n: "Mistral", d: "mistral.ai", cat: "AI", reg: "Europe", st: "Growth", p: 4, b: "Open-weight European AI models.", desc: "A European AI lab building efficient open-weight and commercial large language models.", founded: 2023, hq: "Paris, France", funding: "$1.1B+", val: "$14B", fo: ["Arthur Mensch", "Guillaume Lample", "Timothée Lacroix"], tags: ["Artificial Intelligence", "Open Source", "Europe"], xh: "MistralAI", cbh: "mistral-ai" },
  { n: "Perplexity", d: "perplexity.ai", cat: "AI", reg: "US", st: "Growth", p: 4, b: "AI answer engine for the web.", desc: "An AI-powered answer engine that responds with cited, real-time information from the web.", founded: 2022, hq: "San Francisco, USA", funding: "$1B+", val: "$18B", fo: ["Aravind Srinivas", "Denis Yarats", "Johnny Ho"], tags: ["Artificial Intelligence", "Search", "Consumer"], xh: "perplexity_ai", cbh: "perplexity-ai" },
  { n: "Cursor", d: "cursor.com", cat: "AI", reg: "US", st: "Growth", p: 4, b: "The AI code editor.", desc: "Anysphere's AI-native code editor that helps developers write and edit code with AI.", founded: 2022, hq: "San Francisco, USA", fo: ["Michael Truell", "Sualeh Asif", "Arvid Lunnemark", "Aman Sanger"], tags: ["Artificial Intelligence", "Developer Tools"], cbh: "anysphere" },
  { n: "Scale AI", d: "scale.com", cat: "AI", reg: "US", st: "Late", p: 4, b: "Data labeling & infrastructure for AI.", founded: 2016, hq: "San Francisco, USA", fo: ["Alexandr Wang", "Lucy Guo"], tags: ["Artificial Intelligence", "Data"], xh: "scale_AI", cbh: "scaleai" },
  { n: "Hugging Face", d: "huggingface.co", cat: "AI", reg: "US", st: "Growth", p: 4, b: "The open-source AI community & model hub.", founded: 2016, hq: "New York, USA", fo: ["Clément Delangue", "Julien Chaumond", "Thomas Wolf"], tags: ["Artificial Intelligence", "Open Source"], xh: "huggingface", cbh: "hugging-face" },
  { n: "ElevenLabs", d: "elevenlabs.io", cat: "AI", reg: "US", st: "Growth", p: 4, b: "AI voice & audio generation.", founded: 2022, hq: "New York, USA", fo: ["Piotr Dąbkowski", "Mati Staniszewski"], tags: ["Artificial Intelligence", "Voice"], cbh: "elevenlabs" },
  { n: "Cohere", d: "cohere.com", cat: "AI", reg: "Canada", st: "Growth", p: 3, b: "Enterprise LLMs.", founded: 2019, hq: "Toronto, Canada", fo: ["Aidan Gomez", "Nick Frosst", "Ivan Zhang"], tags: ["Artificial Intelligence", "Enterprise"], cbh: "cohere" },
  { n: "Together AI", d: "together.ai", cat: "AI", reg: "US", st: "Growth", p: 3, b: "Cloud for open-source AI.", founded: 2022, hq: "San Francisco, USA", tags: ["Artificial Intelligence", "Cloud", "Open Source"], cbh: "together-ai" },
  { n: "Midjourney", d: "midjourney.com", cat: "AI", reg: "US", st: "Growth", p: 4, b: "AI image generation.", founded: 2021, hq: "San Francisco, USA", fo: ["David Holz"], tags: ["Artificial Intelligence", "Image Generation"] },
  { n: "Runway", d: "runwayml.com", cat: "AI", reg: "US", st: "Growth", p: 3, b: "AI video generation & creative tools.", founded: 2018, hq: "New York, USA", fo: ["Cristóbal Valenzuela", "Anastasis Germanidis", "Alejandro Matamala"], tags: ["Artificial Intelligence", "Video"], cbh: "runwayml" },
  { n: "Character.AI", d: "character.ai", cat: "AI", reg: "US", st: "Growth", p: 3, b: "AI companions & chatbots.", founded: 2021, hq: "Menlo Park, USA", fo: ["Noam Shazeer", "Daniel De Freitas"], tags: ["Artificial Intelligence", "Consumer"] },
  { n: "Synthesia", d: "synthesia.io", cat: "AI", reg: "Europe", st: "Growth", p: 3, b: "AI video avatars for business.", founded: 2017, hq: "London, UK", tags: ["Artificial Intelligence", "Video"], cbh: "synthesia" },
  { n: "Suno", d: "suno.com", cat: "AI", reg: "US", st: "Growth", p: 3, b: "AI music generation.", founded: 2022, hq: "Cambridge, USA", tags: ["Artificial Intelligence", "Music"] },
  { n: "Glean", d: "glean.com", cat: "AI", reg: "US", st: "Growth", p: 3, b: "AI-powered work search & assistant.", founded: 2019, hq: "Palo Alto, USA", fo: ["Arvind Jain"], tags: ["Artificial Intelligence", "Enterprise", "Search"], cbh: "glean" },
  { n: "Harvey", d: "harvey.ai", cat: "AI", reg: "US", st: "Growth", p: 3, b: "Generative AI for legal work.", founded: 2022, hq: "San Francisco, USA", fo: ["Winston Weinberg", "Gabriel Pereyra"], tags: ["Artificial Intelligence", "Legal"] },
  { n: "Sierra", d: "sierra.ai", cat: "AI", reg: "US", st: "Growth", p: 3, b: "Conversational AI agents for business.", founded: 2023, hq: "San Francisco, USA", fo: ["Bret Taylor", "Clay Bavor"], tags: ["Artificial Intelligence", "Agents"] },
  { n: "Writer", d: "writer.com", cat: "AI", reg: "US", st: "Growth", p: 3, b: "Enterprise generative AI platform.", founded: 2020, hq: "San Francisco, USA", fo: ["May Habib", "Waseem Alshikh"], tags: ["Artificial Intelligence", "Enterprise"], cbh: "writer" },
  { n: "Groq", d: "groq.com", cat: "AI", reg: "US", st: "Growth", p: 3, b: "Ultra-fast AI inference chips.", founded: 2016, hq: "Mountain View, USA", fo: ["Jonathan Ross"], tags: ["Artificial Intelligence", "Hardware", "Inference"], cbh: "groq" },
  { n: "Cerebras", d: "cerebras.net", cat: "AI", reg: "US", st: "Late", p: 3, b: "Wafer-scale AI chips.", founded: 2015, hq: "Sunnyvale, USA", fo: ["Andrew Feldman"], tags: ["Artificial Intelligence", "Hardware"], cbh: "cerebras-systems" },
  { n: "CoreWeave", d: "coreweave.com", cat: "AI", reg: "US", st: "Late", p: 4, b: "GPU cloud for AI.", founded: 2017, hq: "Livingston, USA", tags: ["Artificial Intelligence", "Cloud", "Infrastructure"], cbh: "coreweave" },
  { n: "Lambda", d: "lambdalabs.com", cat: "AI", reg: "US", st: "Growth", p: 3, b: "GPU cloud & workstations for AI.", founded: 2012, hq: "San Jose, USA", tags: ["Artificial Intelligence", "Cloud"], cbh: "lambda-labs" },
  { n: "Thinking Machines Lab", d: "thinkingmachines.ai", cat: "AI", reg: "US", st: "Growth", p: 3, b: "AI research lab founded by Mira Murati.", founded: 2025, hq: "San Francisco, USA", fo: ["Mira Murati"], tags: ["Artificial Intelligence", "Research"] },
  { n: "Safe Superintelligence", d: "ssi.inc", cat: "AI", reg: "US", st: "Growth", p: 3, b: "Ilya Sutskever's superintelligence lab.", founded: 2024, hq: "Palo Alto, USA", fo: ["Ilya Sutskever", "Daniel Gross", "Daniel Levy"], tags: ["Artificial Intelligence", "Research", "AI Safety"] },
  { n: "Physical Intelligence", d: "physicalintelligence.company", cat: "AI", reg: "US", st: "Growth", p: 3, b: "Foundation models for robots.", founded: 2024, hq: "San Francisco, USA", tags: ["Artificial Intelligence", "Robotics"] },
  { n: "World Labs", d: "worldlabs.ai", cat: "AI", reg: "US", st: "Growth", p: 3, b: "Spatial intelligence & 3D world models.", founded: 2024, hq: "San Francisco, USA", fo: ["Fei-Fei Li"], tags: ["Artificial Intelligence", "3D"] },
  { n: "Windsurf", d: "windsurf.com", cat: "AI", reg: "US", st: "Growth", p: 3, b: "AI coding agent & IDE (formerly Codeium).", founded: 2021, hq: "Mountain View, USA", tags: ["Artificial Intelligence", "Developer Tools"] },
  { n: "Poolside", d: "poolside.ai", cat: "AI", reg: "US", st: "Growth", p: 2, b: "AI for software development.", founded: 2023, hq: "Paris / SF", tags: ["Artificial Intelligence", "Developer Tools"] },
  { n: "Magic", d: "magic.dev", cat: "AI", reg: "US", st: "Growth", p: 2, b: "Frontier models for code.", founded: 2022, hq: "San Francisco, USA", tags: ["Artificial Intelligence", "Developer Tools"] },
  { n: "Cartesia", d: "cartesia.ai", cat: "AI", reg: "US", st: "Growth", p: 2, b: "Real-time voice & multimodal models.", founded: 2023, hq: "San Francisco, USA", tags: ["Artificial Intelligence", "Voice"] },
  { n: "Decagon", d: "decagon.ai", cat: "AI", reg: "US", st: "Growth", p: 2, b: "AI agents for customer support.", founded: 2023, hq: "San Francisco, USA", tags: ["Artificial Intelligence", "Agents", "Support"] },
  { n: "Hebbia", d: "hebbia.ai", cat: "AI", reg: "US", st: "Growth", p: 2, b: "AI for financial & legal knowledge work.", founded: 2020, hq: "New York, USA", tags: ["Artificial Intelligence", "Finance"] },
  { n: "Sakana AI", d: "sakana.ai", cat: "AI", reg: "APAC", st: "Growth", p: 2, b: "Nature-inspired AI research (Tokyo).", founded: 2023, hq: "Tokyo, Japan", tags: ["Artificial Intelligence", "Research"] },
  { n: "Luma AI", d: "lumalabs.ai", cat: "AI", reg: "US", st: "Growth", p: 2, b: "AI video & 3D capture.", founded: 2021, hq: "San Francisco, USA", tags: ["Artificial Intelligence", "Video", "3D"] },
  { n: "Mercor", d: "mercor.com", cat: "AI", reg: "US", st: "Growth", p: 2, b: "AI hiring & data marketplace for labs.", founded: 2023, hq: "San Francisco, USA", tags: ["Artificial Intelligence", "Data", "Marketplace"] },
  { n: "Cresta", d: "cresta.com", cat: "AI", reg: "US", st: "Growth", p: 2, b: "AI for contact centers.", founded: 2017, hq: "San Francisco, USA", tags: ["Artificial Intelligence", "Support"] },

  // ---------------- Fintech ----------------
  { n: "Stripe", d: "stripe.com", cat: "Fintech", reg: "US", st: "Late", p: 5, b: "Payments infrastructure for the internet.", desc: "Financial infrastructure for the internet — APIs that power online payments and money movement for businesses of every size.", founded: 2010, hq: "San Francisco & Dublin", emp: "5,001–10,000", funding: "$9.4B", val: "$91.5B", fo: ["Patrick Collison", "John Collison"], tags: ["Fintech", "Payments", "Infrastructure"], xh: "stripe", lih: "stripe", cbh: "stripe" },
  { n: "Plaid", d: "plaid.com", cat: "Fintech", reg: "US", st: "Late", p: 4, b: "The data network for fintech apps.", founded: 2013, hq: "San Francisco, USA", fo: ["Zach Perret", "William Hockey"], tags: ["Fintech", "Infrastructure", "Open Banking"], cbh: "plaid" },
  { n: "Ramp", d: "ramp.com", cat: "Fintech", reg: "US", st: "Growth", p: 4, b: "Corporate cards & spend management.", founded: 2019, hq: "New York, USA", val: "$22.5B", fo: ["Eric Glyman", "Karim Atiyeh"], tags: ["Fintech", "Corporate Cards", "Spend"], xh: "tryramp", cbh: "ramp" },
  { n: "Brex", d: "brex.com", cat: "Fintech", reg: "US", st: "Late", p: 4, b: "Corporate cards & finance for startups.", founded: 2017, hq: "San Francisco, USA", fo: ["Henrique Dubugras", "Pedro Franceschi"], tags: ["Fintech", "Corporate Cards"], cbh: "brex" },
  { n: "Deel", d: "deel.com", cat: "Fintech", reg: "US", st: "Growth", p: 4, b: "Global payroll & compliance.", founded: 2019, hq: "San Francisco, USA", val: "$12.6B", fo: ["Alex Bouaziz", "Shuo Wang"], tags: ["Fintech", "HR", "Global Payroll"], cbh: "deel" },
  { n: "Revolut", d: "revolut.com", cat: "Fintech", reg: "Europe", st: "Late", p: 5, b: "All-in-one financial super-app.", founded: 2015, hq: "London, UK", emp: "5,001–10,000", val: "$45B", fo: ["Nikolay Storonsky", "Vlad Yatsenko"], tags: ["Fintech", "Neobank", "Consumer"], xh: "RevolutApp", cbh: "revolut" },
  { n: "Wise", d: "wise.com", cat: "Fintech", reg: "Europe", st: "Late", p: 4, b: "Cross-border money transfers.", founded: 2011, hq: "London, UK", fo: ["Kristo Käärmann", "Taavet Hinrikus"], tags: ["Fintech", "Payments"], cbh: "transferwise" },
  { n: "Chime", d: "chime.com", cat: "Fintech", reg: "US", st: "Late", p: 4, b: "Consumer neobank.", founded: 2012, hq: "San Francisco, USA", fo: ["Chris Britt", "Ryan King"], tags: ["Fintech", "Neobank", "Consumer"], cbh: "chime" },
  { n: "Klarna", d: "klarna.com", cat: "Fintech", reg: "Europe", st: "Late", p: 5, b: "Buy now, pay later.", founded: 2005, hq: "Stockholm, Sweden", fo: ["Sebastian Siemiatkowski", "Niklas Adalberth", "Victor Jacobsson"], tags: ["Fintech", "BNPL", "Consumer"], cbh: "klarna" },
  { n: "Mercury", d: "mercury.com", cat: "Fintech", reg: "US", st: "Growth", p: 4, b: "Banking for startups.", founded: 2017, hq: "San Francisco, USA", fo: ["Immad Akhund", "Max Tagher", "Jason Zhang"], tags: ["Fintech", "Banking", "Startups"], cbh: "mercury-fintech" },
  { n: "Checkout.com", d: "checkout.com", cat: "Fintech", reg: "Europe", st: "Late", p: 3, b: "Global payment processing.", founded: 2012, hq: "London, UK", fo: ["Guillaume Pousaz"], tags: ["Fintech", "Payments"], cbh: "checkout-com" },
  { n: "Airwallex", d: "airwallex.com", cat: "Fintech", reg: "APAC", st: "Late", p: 3, b: "Global business banking & payments.", founded: 2015, hq: "Singapore", tags: ["Fintech", "Payments"], cbh: "airwallex" },
  { n: "Monzo", d: "monzo.com", cat: "Fintech", reg: "Europe", st: "Late", p: 4, b: "UK consumer neobank.", founded: 2015, hq: "London, UK", fo: ["Tom Blomfield"], tags: ["Fintech", "Neobank"], cbh: "monzo" },
  { n: "N26", d: "n26.com", cat: "Fintech", reg: "Europe", st: "Late", p: 3, b: "European mobile bank.", founded: 2013, hq: "Berlin, Germany", fo: ["Valentin Stalf", "Maximilian Tayenthal"], tags: ["Fintech", "Neobank"], cbh: "n26" },
  { n: "Qonto", d: "qonto.com", cat: "Fintech", reg: "Europe", st: "Growth", p: 3, b: "Business banking for SMEs & freelancers.", founded: 2016, hq: "Paris, France", tags: ["Fintech", "SME"], cbh: "qonto" },
  { n: "Trade Republic", d: "traderepublic.com", cat: "Fintech", reg: "Europe", st: "Late", p: 3, b: "Commission-free investing & saving.", founded: 2015, hq: "Berlin, Germany", tags: ["Fintech", "Investing"], cbh: "trade-republic" },
  { n: "Navan", d: "navan.com", cat: "Fintech", reg: "US", st: "Late", p: 3, b: "Corporate travel & expense.", founded: 2015, hq: "Palo Alto, USA", fo: ["Ariel Cohen", "Ilan Twig"], tags: ["Fintech", "Travel", "Expense"], cbh: "tripactions" },
  { n: "Gusto", d: "gusto.com", cat: "Fintech", reg: "US", st: "Late", p: 3, b: "Payroll & benefits for SMBs.", founded: 2011, hq: "San Francisco, USA", tags: ["Fintech", "HR", "Payroll"], cbh: "gusto" },
  { n: "SumUp", d: "sumup.com", cat: "Fintech", reg: "Europe", st: "Late", p: 3, b: "Card readers & tools for small merchants.", founded: 2012, hq: "London, UK", tags: ["Fintech", "Payments", "SMB"], cbh: "sumup" },
  { n: "Rapyd", d: "rapyd.net", cat: "Fintech", reg: "Israel", st: "Late", p: 3, b: "Global fintech-as-a-service.", founded: 2016, hq: "Tel Aviv, Israel", tags: ["Fintech", "Payments"], cbh: "rapyd" },
  { n: "Alan", d: "alan.com", cat: "Fintech", reg: "Europe", st: "Late", p: 3, b: "Health insurance & care super-app.", founded: 2016, hq: "Paris, France", tags: ["Fintech", "Insurance", "Health"], cbh: "alan" },
  { n: "Pennylane", d: "pennylane.com", cat: "Fintech", reg: "Europe", st: "Growth", p: 2, b: "Accounting & finance platform for SMEs.", founded: 2020, hq: "Paris, France", tags: ["Fintech", "Accounting"] },

  // ---------------- Crypto ----------------
  { n: "Coinbase", d: "coinbase.com", cat: "Crypto", reg: "US", st: "Late", p: 5, b: "Crypto exchange & platform.", founded: 2012, hq: "Remote, USA", fo: ["Brian Armstrong", "Fred Ehrsam"], tags: ["Crypto", "Exchange"], cbh: "coinbase" },
  { n: "Kraken", d: "kraken.com", cat: "Crypto", reg: "US", st: "Late", p: 4, b: "Crypto exchange.", founded: 2011, hq: "San Francisco, USA", fo: ["Jesse Powell"], tags: ["Crypto", "Exchange"], cbh: "kraken" },
  { n: "Circle", d: "circle.com", cat: "Crypto", reg: "US", st: "Late", p: 4, b: "Issuer of the USDC stablecoin.", founded: 2013, hq: "New York, USA", fo: ["Jeremy Allaire", "Sean Neville"], tags: ["Crypto", "Stablecoins"], cbh: "circle" },
  { n: "Ripple", d: "ripple.com", cat: "Crypto", reg: "US", st: "Late", p: 4, b: "Crypto for cross-border payments.", founded: 2012, hq: "San Francisco, USA", tags: ["Crypto", "Payments"], cbh: "ripple" },
  { n: "Fireblocks", d: "fireblocks.com", cat: "Crypto", reg: "Israel", st: "Late", p: 3, b: "Digital-asset custody & infrastructure.", founded: 2018, hq: "New York / Tel Aviv", tags: ["Crypto", "Infrastructure", "Custody"], cbh: "fireblocks" },
  { n: "Chainalysis", d: "chainalysis.com", cat: "Crypto", reg: "US", st: "Late", p: 3, b: "Blockchain analytics & compliance.", founded: 2014, hq: "New York, USA", tags: ["Crypto", "Analytics", "Compliance"], cbh: "chainalysis" },
  { n: "Ledger", d: "ledger.com", cat: "Crypto", reg: "Europe", st: "Late", p: 3, b: "Hardware crypto wallets.", founded: 2014, hq: "Paris, France", tags: ["Crypto", "Hardware", "Security"], cbh: "ledger" },
  { n: "Consensys", d: "consensys.io", cat: "Crypto", reg: "US", st: "Late", p: 3, b: "Ethereum software (MetaMask, Infura).", founded: 2014, hq: "New York, USA", fo: ["Joseph Lubin"], tags: ["Crypto", "Ethereum"], cbh: "consensus-systems-consensys" },
  { n: "Alchemy", d: "alchemy.com", cat: "Crypto", reg: "US", st: "Growth", p: 3, b: "Developer platform for web3.", founded: 2017, hq: "San Francisco, USA", tags: ["Crypto", "Developer Tools"], cbh: "alchemy" },
  { n: "Phantom", d: "phantom.com", cat: "Crypto", reg: "US", st: "Growth", p: 3, b: "Multichain crypto wallet.", founded: 2021, hq: "San Francisco, USA", tags: ["Crypto", "Wallet"] },

  // ---------------- Dev Tools ----------------
  { n: "Vercel", d: "vercel.com", cat: "Dev Tools", reg: "US", st: "Growth", p: 4, b: "The frontend cloud & Next.js.", founded: 2015, hq: "San Francisco, USA", val: "$3.25B", fo: ["Guillermo Rauch"], tags: ["Developer Tools", "Cloud", "Frontend"], xh: "vercel", cbh: "vercel" },
  { n: "Supabase", d: "supabase.com", cat: "Dev Tools", reg: "US", st: "Growth", p: 4, b: "The open-source Firebase alternative.", founded: 2020, hq: "Remote", fo: ["Paul Copplestone", "Ant Wilson"], tags: ["Developer Tools", "Database", "Open Source"], xh: "supabase", cbh: "supabase" },
  { n: "Replit", d: "replit.com", cat: "Dev Tools", reg: "US", st: "Growth", p: 4, b: "Build software with AI in the browser.", founded: 2016, hq: "San Francisco, USA", fo: ["Amjad Masad", "Faris Masad", "Haya Odeh"], tags: ["Developer Tools", "AI"], cbh: "replit" },
  { n: "Retool", d: "retool.com", cat: "Dev Tools", reg: "US", st: "Growth", p: 3, b: "Build internal tools fast.", founded: 2017, hq: "San Francisco, USA", val: "$3.2B", fo: ["David Hsu"], tags: ["Developer Tools", "Low-code"], cbh: "retool" },
  { n: "GitLab", d: "gitlab.com", cat: "Dev Tools", reg: "US", st: "Late", p: 4, b: "DevOps platform.", founded: 2011, hq: "Remote", fo: ["Sytse Sijbrandij", "Dmitriy Zaporozhets"], tags: ["Developer Tools", "DevOps"], cbh: "gitlab-com" },
  { n: "Postman", d: "postman.com", cat: "Dev Tools", reg: "US", st: "Late", p: 3, b: "API development platform.", founded: 2014, hq: "San Francisco, USA", fo: ["Abhinav Asthana", "Ankit Sobti", "Abhijit Kane"], tags: ["Developer Tools", "API"], cbh: "postman" },
  { n: "Sentry", d: "sentry.io", cat: "Dev Tools", reg: "US", st: "Growth", p: 3, b: "Application monitoring & error tracking.", founded: 2012, hq: "San Francisco, USA", tags: ["Developer Tools", "Observability"], cbh: "sentry" },
  { n: "Neon", d: "neon.tech", cat: "Dev Tools", reg: "US", st: "Growth", p: 3, b: "Serverless Postgres.", founded: 2021, hq: "San Francisco, USA", tags: ["Developer Tools", "Database"], cbh: "neon-serverless-postgres" },
  { n: "Render", d: "render.com", cat: "Dev Tools", reg: "US", st: "Growth", p: 2, b: "Cloud application hosting.", founded: 2019, hq: "San Francisco, USA", tags: ["Developer Tools", "Cloud"] },
  { n: "Railway", d: "railway.com", cat: "Dev Tools", reg: "US", st: "Growth", p: 2, b: "Deploy apps without infrastructure headaches.", founded: 2020, hq: "San Francisco, USA", tags: ["Developer Tools", "Cloud"] },
  { n: "PlanetScale", d: "planetscale.com", cat: "Dev Tools", reg: "US", st: "Growth", p: 2, b: "Serverless MySQL database.", founded: 2018, hq: "Mountain View, USA", tags: ["Developer Tools", "Database"], cbh: "planetscale" },
  { n: "Netlify", d: "netlify.com", cat: "Dev Tools", reg: "US", st: "Growth", p: 3, b: "Web development & hosting platform.", founded: 2014, hq: "San Francisco, USA", tags: ["Developer Tools", "Frontend"], cbh: "netlify" },
  { n: "Grafana Labs", d: "grafana.com", cat: "Dev Tools", reg: "US", st: "Late", p: 3, b: "Open-source observability.", founded: 2014, hq: "New York, USA", tags: ["Developer Tools", "Observability"], cbh: "grafana-labs" },
  { n: "Sourcegraph", d: "sourcegraph.com", cat: "Dev Tools", reg: "US", st: "Growth", p: 2, b: "Code search & AI coding.", founded: 2013, hq: "San Francisco, USA", tags: ["Developer Tools", "Code Search"], cbh: "sourcegraph" },
  { n: "Warp", d: "warp.dev", cat: "Dev Tools", reg: "US", st: "Growth", p: 2, b: "The AI-powered terminal.", founded: 2020, hq: "San Francisco, USA", tags: ["Developer Tools", "Terminal"] },
  { n: "Clerk", d: "clerk.com", cat: "Dev Tools", reg: "US", st: "Growth", p: 2, b: "Authentication & user management for devs.", founded: 2020, hq: "San Francisco, USA", tags: ["Developer Tools", "Auth"] },
  { n: "WorkOS", d: "workos.com", cat: "Dev Tools", reg: "US", st: "Growth", p: 2, b: "Enterprise-readiness APIs.", founded: 2019, hq: "San Francisco, USA", fo: ["Michael Grinich"], tags: ["Developer Tools", "Enterprise", "Auth"] },
  { n: "Resend", d: "resend.com", cat: "Dev Tools", reg: "US", st: "Growth", p: 2, b: "Email API for developers.", founded: 2023, hq: "San Francisco, USA", tags: ["Developer Tools", "Email"] },
  { n: "Temporal", d: "temporal.io", cat: "Dev Tools", reg: "US", st: "Growth", p: 2, b: "Durable execution for backend workflows.", founded: 2019, hq: "Seattle, USA", tags: ["Developer Tools", "Backend"], cbh: "temporal-technologies" },
  { n: "Deno", d: "deno.com", cat: "Dev Tools", reg: "US", st: "Growth", p: 2, b: "Modern JavaScript/TypeScript runtime.", founded: 2018, hq: "San Francisco, USA", fo: ["Ryan Dahl"], tags: ["Developer Tools", "Runtime"] },

  // ---------------- Data & Infra ----------------
  { n: "Databricks", d: "databricks.com", cat: "Data & Infra", reg: "US", st: "Late", p: 5, b: "Data + AI lakehouse platform.", desc: "Unifies data engineering, analytics and machine learning on one cloud platform.", founded: 2013, hq: "San Francisco, USA", emp: "5,001–10,000", funding: "$14B+", val: "$62B", fo: ["Ali Ghodsi", "Matei Zaharia", "Ion Stoica", "Reynold Xin"], tags: ["Data", "Artificial Intelligence", "Analytics"], xh: "databricks", cbh: "databricks" },
  { n: "Snowflake", d: "snowflake.com", cat: "Data & Infra", reg: "US", st: "Late", p: 5, b: "The cloud data platform.", founded: 2012, hq: "Bozeman, USA", tags: ["Data", "Cloud", "Analytics"], cbh: "snowflake-computing" },
  { n: "dbt Labs", d: "getdbt.com", cat: "Data & Infra", reg: "US", st: "Late", p: 3, b: "Transformation layer for the data stack.", founded: 2016, hq: "Philadelphia, USA", fo: ["Tristan Handy"], tags: ["Data", "Analytics Engineering"], cbh: "dbt-labs" },
  { n: "Fivetran", d: "fivetran.com", cat: "Data & Infra", reg: "US", st: "Late", p: 3, b: "Automated data movement.", founded: 2012, hq: "Oakland, USA", tags: ["Data", "ETL"], cbh: "fivetran" },
  { n: "ClickHouse", d: "clickhouse.com", cat: "Data & Infra", reg: "US", st: "Growth", p: 3, b: "Fast open-source analytical database.", founded: 2021, hq: "San Francisco, USA", tags: ["Data", "Database", "Open Source"], cbh: "clickhouse" },
  { n: "Pinecone", d: "pinecone.io", cat: "Data & Infra", reg: "US", st: "Growth", p: 3, b: "Vector database for AI.", founded: 2019, hq: "New York, USA", fo: ["Edo Liberty"], tags: ["Data", "Vector Database", "AI"], cbh: "pinecone" },
  { n: "Airbyte", d: "airbyte.com", cat: "Data & Infra", reg: "US", st: "Growth", p: 2, b: "Open-source data integration.", founded: 2020, hq: "San Francisco, USA", tags: ["Data", "ETL", "Open Source"], cbh: "airbyte" },
  { n: "Weaviate", d: "weaviate.io", cat: "Data & Infra", reg: "Europe", st: "Growth", p: 2, b: "Open-source vector database.", founded: 2019, hq: "Amsterdam, Netherlands", tags: ["Data", "Vector Database"] },
  { n: "Hex", d: "hex.tech", cat: "Data & Infra", reg: "US", st: "Growth", p: 2, b: "Collaborative analytics & data notebooks.", founded: 2019, hq: "San Francisco, USA", tags: ["Data", "Analytics"] },
  { n: "MotherDuck", d: "motherduck.com", cat: "Data & Infra", reg: "US", st: "Growth", p: 2, b: "Serverless analytics on DuckDB.", founded: 2022, hq: "Seattle, USA", tags: ["Data", "Analytics"] },
  { n: "Cribl", d: "cribl.io", cat: "Data & Infra", reg: "US", st: "Late", p: 2, b: "Observability data pipelines.", founded: 2018, hq: "San Francisco, USA", tags: ["Data", "Observability"] },

  // ---------------- Security ----------------
  { n: "Wiz", d: "wiz.io", cat: "Security", reg: "Israel", st: "Late", p: 4, b: "Cloud security, fastest to $100M ARR.", desc: "Scans cloud environments for risk; agreed to be acquired by Google in 2025.", founded: 2020, hq: "New York & Tel Aviv", emp: "1,001–5,000", funding: "$1.9B", val: "$32B", fo: ["Assaf Rappaport", "Ami Luttwak", "Yinon Costica", "Roy Reznik"], tags: ["Cybersecurity", "Cloud Security"], xh: "wiz_io", cbh: "wiz-2" },
  { n: "Snyk", d: "snyk.io", cat: "Security", reg: "US", st: "Late", p: 3, b: "Developer-first security.", founded: 2015, hq: "Boston, USA", tags: ["Cybersecurity", "DevSecOps"], cbh: "snyk" },
  { n: "1Password", d: "1password.com", cat: "Security", reg: "Canada", st: "Late", p: 3, b: "Password & secrets management.", founded: 2005, hq: "Toronto, Canada", tags: ["Cybersecurity", "Passwords"], cbh: "agilebits" },
  { n: "Abnormal AI", d: "abnormalsecurity.com", cat: "Security", reg: "US", st: "Late", p: 3, b: "AI-native email & account security.", founded: 2018, hq: "San Francisco, USA", tags: ["Cybersecurity", "Email"], cbh: "abnormal-security" },
  { n: "Vanta", d: "vanta.com", cat: "Security", reg: "US", st: "Growth", p: 3, b: "Automated security & compliance (SOC 2).", founded: 2018, hq: "San Francisco, USA", fo: ["Christina Cacioppo"], tags: ["Cybersecurity", "Compliance"], cbh: "vanta" },
  { n: "Drata", d: "drata.com", cat: "Security", reg: "US", st: "Growth", p: 2, b: "Compliance automation.", founded: 2020, hq: "San Diego, USA", tags: ["Cybersecurity", "Compliance"] },
  { n: "Tailscale", d: "tailscale.com", cat: "Security", reg: "Canada", st: "Growth", p: 3, b: "Zero-config VPN & secure networking.", founded: 2019, hq: "Toronto, Canada", tags: ["Cybersecurity", "Networking"], cbh: "tailscale" },
  { n: "Cyera", d: "cyera.com", cat: "Security", reg: "Israel", st: "Growth", p: 3, b: "AI-powered data security.", founded: 2021, hq: "New York, USA", tags: ["Cybersecurity", "Data Security"] },
  { n: "Semgrep", d: "semgrep.dev", cat: "Security", reg: "US", st: "Growth", p: 2, b: "Static analysis for secure code.", founded: 2017, hq: "San Francisco, USA", tags: ["Cybersecurity", "DevSecOps"] },
  { n: "Chainguard", d: "chainguard.dev", cat: "Security", reg: "US", st: "Growth", p: 2, b: "Secure software supply chain.", founded: 2021, hq: "Kirkland, USA", tags: ["Cybersecurity", "Supply Chain"] },
  { n: "Persona", d: "withpersona.com", cat: "Security", reg: "US", st: "Growth", p: 2, b: "Identity verification platform.", founded: 2018, hq: "San Francisco, USA", tags: ["Cybersecurity", "Identity"] },

  // ---------------- SaaS ----------------
  { n: "Figma", d: "figma.com", cat: "SaaS", reg: "US", st: "Late", p: 5, b: "Collaborative interface design.", desc: "Browser-based, real-time design & prototyping. Public: NYSE: FIG.", founded: 2012, hq: "San Francisco, USA", emp: "1,001–5,000", val: "~$60B (public)", fo: ["Dylan Field", "Evan Wallace"], tags: ["Design", "SaaS", "Collaboration"], xh: "figma", cbh: "figma" },
  { n: "Canva", d: "canva.com", cat: "SaaS", reg: "APAC", st: "Late", p: 5, b: "Design for everyone, in the browser.", founded: 2013, hq: "Sydney, Australia", val: "$32B", fo: ["Melanie Perkins", "Cliff Obrecht", "Cameron Adams"], tags: ["Design", "SaaS", "Consumer"], cbh: "canva" },
  { n: "Airtable", d: "airtable.com", cat: "SaaS", reg: "US", st: "Late", p: 4, b: "The no-code app & database platform.", founded: 2012, hq: "San Francisco, USA", fo: ["Howie Liu", "Andrew Ofstad", "Emmett Nicholas"], tags: ["SaaS", "No-code", "Database"], cbh: "airtable" },
  { n: "Miro", d: "miro.com", cat: "SaaS", reg: "Europe", st: "Late", p: 4, b: "The visual collaboration whiteboard.", founded: 2011, hq: "Amsterdam, Netherlands", tags: ["SaaS", "Collaboration"], cbh: "realtimeboard" },
  { n: "Grammarly", d: "grammarly.com", cat: "SaaS", reg: "US", st: "Late", p: 4, b: "AI writing assistant.", founded: 2009, hq: "San Francisco, USA", fo: ["Max Lytvyn", "Alex Shevchenko", "Dmytro Lider"], tags: ["SaaS", "AI", "Writing"], cbh: "grammarly" },
  { n: "Intercom", d: "intercom.com", cat: "SaaS", reg: "US", st: "Late", p: 3, b: "AI-first customer service.", founded: 2011, hq: "San Francisco, USA", fo: ["Eoghan McCabe", "Des Traynor", "Ciaran Lee", "David Barrett"], tags: ["SaaS", "Support"], cbh: "intercom" },
  { n: "Zapier", d: "zapier.com", cat: "SaaS", reg: "US", st: "Late", p: 4, b: "Automation between your apps.", founded: 2011, hq: "Remote", fo: ["Wade Foster", "Bryan Helmig", "Mike Knoop"], tags: ["SaaS", "Automation"], cbh: "zapier" },
  { n: "Loom", d: "loom.com", cat: "SaaS", reg: "US", st: "Growth", p: 3, b: "Async video messaging for work.", founded: 2015, hq: "San Francisco, USA", tags: ["SaaS", "Video"], cbh: "loom" },
  { n: "Calendly", d: "calendly.com", cat: "SaaS", reg: "US", st: "Late", p: 3, b: "Scheduling automation.", founded: 2013, hq: "Atlanta, USA", fo: ["Tope Awotona"], tags: ["SaaS", "Scheduling"], cbh: "calendly" },
  { n: "ClickUp", d: "clickup.com", cat: "SaaS", reg: "US", st: "Late", p: 3, b: "All-in-one work & project management.", founded: 2017, hq: "San Diego, USA", tags: ["SaaS", "Project Management"], cbh: "clickup" },
  { n: "Personio", d: "personio.com", cat: "SaaS", reg: "Europe", st: "Late", p: 3, b: "HR software for European SMEs.", founded: 2015, hq: "Munich, Germany", tags: ["SaaS", "HR"], cbh: "personio" },
  { n: "Lattice", d: "lattice.com", cat: "SaaS", reg: "US", st: "Growth", p: 2, b: "People management & performance.", founded: 2015, hq: "San Francisco, USA", fo: ["Jack Altman", "Eric Koslow"], tags: ["SaaS", "HR"] },
  { n: "Gamma", d: "gamma.app", cat: "SaaS", reg: "US", st: "Growth", p: 3, b: "AI-powered presentations & docs.", founded: 2020, hq: "San Francisco, USA", tags: ["SaaS", "AI", "Presentations"] },
  { n: "Celonis", d: "celonis.com", cat: "SaaS", reg: "Europe", st: "Late", p: 3, b: "Process mining & intelligence.", founded: 2011, hq: "Munich, Germany", tags: ["SaaS", "Process Mining"], cbh: "celonis" },
  { n: "DeepL", d: "deepl.com", cat: "SaaS", reg: "Europe", st: "Late", p: 4, b: "AI translation.", founded: 2017, hq: "Cologne, Germany", fo: ["Jaroslaw Kutylowski"], tags: ["SaaS", "AI", "Translation"], cbh: "deepl" },
  { n: "Bending Spoons", d: "bendingspoons.com", cat: "SaaS", reg: "Europe", st: "Late", p: 3, b: "Consumer app operator (Evernote, WeTransfer).", founded: 2013, hq: "Milan, Italy", tags: ["SaaS", "Consumer Apps"], cbh: "bending-spoons" },
  { n: "Photoroom", d: "photoroom.com", cat: "SaaS", reg: "Europe", st: "Growth", p: 2, b: "AI photo editing for commerce.", founded: 2019, hq: "Paris, France", tags: ["SaaS", "AI", "Design"] },

  // ---------------- Productivity ----------------
  { n: "Notion", d: "notion.so", cat: "Productivity", reg: "US", st: "Growth", p: 5, b: "Docs, wikis & the connected workspace.", desc: "An all-in-one connected workspace for notes, docs, wikis, projects and lightweight databases.", founded: 2013, hq: "San Francisco, USA", val: "$10B", fo: ["Ivan Zhao", "Simon Last"], tags: ["Productivity", "SaaS", "Collaboration"], xh: "NotionHQ", cbh: "notion-so" },
  { n: "Linear", d: "linear.app", cat: "Productivity", reg: "US", st: "Growth", p: 4, b: "The issue tracker teams love.", founded: 2019, hq: "San Francisco, USA", fo: ["Karri Saarinen", "Tuomas Artman", "Jori Lallo"], tags: ["Productivity", "Developer Tools"], xh: "linear", cbh: "linear" },
  { n: "Superhuman", d: "superhuman.com", cat: "Productivity", reg: "US", st: "Growth", p: 3, b: "The fastest email experience.", founded: 2014, hq: "San Francisco, USA", fo: ["Rahul Vohra"], tags: ["Productivity", "Email"], cbh: "superhuman" },
  { n: "Coda", d: "coda.io", cat: "Productivity", reg: "US", st: "Growth", p: 2, b: "Docs that work like apps.", founded: 2014, hq: "Mountain View, USA", tags: ["Productivity", "Docs"] },
  { n: "Attio", d: "attio.com", cat: "Productivity", reg: "Europe", st: "Growth", p: 2, b: "The AI-native CRM.", founded: 2019, hq: "London, UK", tags: ["Productivity", "CRM"] },
  { n: "Pitch", d: "pitch.com", cat: "Productivity", reg: "Europe", st: "Growth", p: 2, b: "Collaborative presentation software.", founded: 2018, hq: "Berlin, Germany", tags: ["Productivity", "Presentations"] },
  { n: "Make", d: "make.com", cat: "Productivity", reg: "Europe", st: "Growth", p: 2, b: "Visual automation platform.", founded: 2016, hq: "Prague, Czechia", tags: ["Productivity", "Automation"] },
  { n: "Sana", d: "sana.ai", cat: "Productivity", reg: "Europe", st: "Growth", p: 2, b: "AI-powered knowledge & learning.", founded: 2016, hq: "Stockholm, Sweden", tags: ["Productivity", "AI", "Learning"] },

  // ---------------- Consumer ----------------
  { n: "Discord", d: "discord.com", cat: "Consumer", reg: "US", st: "Late", p: 5, b: "Voice, video & text for communities.", founded: 2015, hq: "San Francisco, USA", fo: ["Jason Citron", "Stan Vishnevskiy"], tags: ["Consumer", "Social", "Communities"], cbh: "discord" },
  { n: "Reddit", d: "reddit.com", cat: "Consumer", reg: "US", st: "Late", p: 5, b: "The front page of the internet.", founded: 2005, hq: "San Francisco, USA", fo: ["Steve Huffman", "Alexis Ohanian"], tags: ["Consumer", "Social"], cbh: "reddit" },
  { n: "Substack", d: "substack.com", cat: "Consumer", reg: "US", st: "Growth", p: 4, b: "Publishing & subscriptions for writers.", founded: 2017, hq: "San Francisco, USA", fo: ["Chris Best", "Hamish McKenzie", "Jairaj Sethi"], tags: ["Consumer", "Media", "Creators"], cbh: "substack" },
  { n: "Patreon", d: "patreon.com", cat: "Consumer", reg: "US", st: "Late", p: 3, b: "Membership platform for creators.", founded: 2013, hq: "San Francisco, USA", fo: ["Jack Conte", "Sam Yam"], tags: ["Consumer", "Creators"], cbh: "patreon" },
  { n: "Duolingo", d: "duolingo.com", cat: "Consumer", reg: "US", st: "Late", p: 4, b: "Gamified language learning.", founded: 2011, hq: "Pittsburgh, USA", fo: ["Luis von Ahn", "Severin Hacker"], tags: ["Consumer", "Edtech"], cbh: "duolingo" },
  { n: "BeReal", d: "bereal.com", cat: "Consumer", reg: "Europe", st: "Growth", p: 3, b: "Authentic once-a-day photo sharing.", founded: 2020, hq: "Paris, France", tags: ["Consumer", "Social"], cbh: "bereal" },
  { n: "Strava", d: "strava.com", cat: "Consumer", reg: "US", st: "Late", p: 3, b: "Social network for athletes.", founded: 2009, hq: "San Francisco, USA", tags: ["Consumer", "Fitness", "Social"], cbh: "strava" },
  { n: "Whoop", d: "whoop.com", cat: "Consumer", reg: "US", st: "Late", p: 3, b: "Wearable fitness & health tracker.", founded: 2012, hq: "Boston, USA", fo: ["Will Ahmed"], tags: ["Consumer", "Wearables", "Health"], cbh: "whoop" },
  { n: "Oura", d: "ouraring.com", cat: "Consumer", reg: "Europe", st: "Late", p: 3, b: "The smart health ring.", founded: 2013, hq: "Oulu, Finland", tags: ["Consumer", "Wearables", "Health"], cbh: "oura" },
  { n: "Partiful", d: "partiful.com", cat: "Consumer", reg: "US", st: "Growth", p: 2, b: "Party invites & event planning.", founded: 2020, hq: "New York, USA", tags: ["Consumer", "Social", "Events"] },
  { n: "Calm", d: "calm.com", cat: "Consumer", reg: "US", st: "Late", p: 3, b: "Meditation & sleep app.", founded: 2012, hq: "San Francisco, USA", tags: ["Consumer", "Wellness"], cbh: "calm-com" },
  { n: "Beli", d: "welcometobeli.com", cat: "Consumer", reg: "US", st: "Growth", p: 3, b: "Rank & discover restaurants with friends.", founded: 2021, hq: "New York, USA", tags: ["Consumer", "Social", "Food"] },

  // ---------------- Commerce ----------------
  { n: "Shopify", d: "shopify.com", cat: "Commerce", reg: "Canada", st: "Late", p: 5, b: "Commerce platform for merchants.", founded: 2006, hq: "Ottawa, Canada", fo: ["Tobias Lütke", "Daniel Weinand", "Scott Lake"], tags: ["Commerce", "E-commerce"], cbh: "shopify" },
  { n: "Instacart", d: "instacart.com", cat: "Commerce", reg: "US", st: "Late", p: 4, b: "Grocery delivery & marketplace.", founded: 2012, hq: "San Francisco, USA", fo: ["Apoorva Mehta"], tags: ["Commerce", "Grocery"], cbh: "instacart" },
  { n: "Faire", d: "faire.com", cat: "Commerce", reg: "US", st: "Late", p: 3, b: "Wholesale marketplace for retailers.", founded: 2017, hq: "San Francisco, USA", fo: ["Max Rhodes"], tags: ["Commerce", "Wholesale", "Marketplace"], cbh: "faire" },
  { n: "Whatnot", d: "whatnot.com", cat: "Commerce", reg: "US", st: "Late", p: 3, b: "Live shopping marketplace.", founded: 2019, hq: "Los Angeles, USA", tags: ["Commerce", "Live Shopping"], cbh: "whatnot" },
  { n: "StockX", d: "stockx.com", cat: "Commerce", reg: "US", st: "Late", p: 3, b: "Marketplace for sneakers & collectibles.", founded: 2015, hq: "Detroit, USA", tags: ["Commerce", "Marketplace"], cbh: "stockx" },
  { n: "Gopuff", d: "gopuff.com", cat: "Commerce", reg: "US", st: "Late", p: 3, b: "Instant delivery of everyday goods.", founded: 2013, hq: "Philadelphia, USA", tags: ["Commerce", "Delivery"], cbh: "gopuff" },
  { n: "Back Market", d: "backmarket.com", cat: "Commerce", reg: "Europe", st: "Late", p: 3, b: "Marketplace for refurbished electronics.", founded: 2014, hq: "Paris, France", tags: ["Commerce", "Marketplace", "Sustainability"], cbh: "back-market" },
  { n: "Vinted", d: "vinted.com", cat: "Commerce", reg: "Europe", st: "Late", p: 3, b: "Second-hand fashion marketplace.", founded: 2008, hq: "Vilnius, Lithuania", tags: ["Commerce", "Marketplace", "Fashion"], cbh: "vinted" },
  { n: "Getir", d: "getir.com", cat: "Commerce", reg: "MENA", st: "Late", p: 2, b: "Ultrafast grocery delivery.", founded: 2015, hq: "Istanbul, Turkey", tags: ["Commerce", "Delivery"], cbh: "getir" },

  // ---------------- Logistics ----------------
  { n: "Flexport", d: "flexport.com", cat: "Logistics", reg: "US", st: "Late", p: 3, b: "Tech-driven freight forwarding.", founded: 2013, hq: "San Francisco, USA", fo: ["Ryan Petersen"], tags: ["Logistics", "Supply Chain"], cbh: "flexport" },
  { n: "Zipline", d: "flyzipline.com", cat: "Logistics", reg: "US", st: "Late", p: 3, b: "Autonomous drone delivery.", founded: 2014, hq: "South San Francisco, USA", tags: ["Logistics", "Drones"], cbh: "zipline" },

  // ---------------- Health ----------------
  { n: "Ro", d: "ro.co", cat: "Health", reg: "US", st: "Late", p: 3, b: "Direct-to-patient telehealth.", founded: 2017, hq: "New York, USA", fo: ["Zachariah Reitano", "Rob Schutz", "Saman Rahmanian"], tags: ["Health", "Telehealth"], cbh: "ro-health" },
  { n: "Hims & Hers", d: "hims.com", cat: "Health", reg: "US", st: "Late", p: 3, b: "Consumer telehealth & wellness.", founded: 2017, hq: "San Francisco, USA", tags: ["Health", "Telehealth", "Consumer"], cbh: "hims" },
  { n: "Abridge", d: "abridge.com", cat: "Health", reg: "US", st: "Growth", p: 3, b: "AI clinical documentation.", founded: 2018, hq: "Pittsburgh, USA", tags: ["Health", "AI"] },
  { n: "OpenEvidence", d: "openevidence.com", cat: "Health", reg: "US", st: "Growth", p: 3, b: "AI copilot for doctors.", founded: 2021, hq: "Cambridge, USA", tags: ["Health", "AI"] },
  { n: "Maven Clinic", d: "mavenclinic.com", cat: "Health", reg: "US", st: "Late", p: 3, b: "Virtual care for women & families.", founded: 2014, hq: "New York, USA", fo: ["Kate Ryder"], tags: ["Health", "Women's Health"], cbh: "maven-clinic" },
  { n: "Hinge Health", d: "hingehealth.com", cat: "Health", reg: "US", st: "Late", p: 3, b: "Digital musculoskeletal care.", founded: 2014, hq: "San Francisco, USA", tags: ["Health", "Digital Health"], cbh: "hinge-health" },
  { n: "Sword Health", d: "swordhealth.com", cat: "Health", reg: "Europe", st: "Late", p: 3, b: "AI-powered physical therapy.", founded: 2015, hq: "Porto, Portugal", tags: ["Health", "AI", "Physical Therapy"], cbh: "sword-health" },
  { n: "Neko Health", d: "nekohealth.com", cat: "Health", reg: "Europe", st: "Growth", p: 3, b: "Preventive full-body health scans.", founded: 2018, hq: "Stockholm, Sweden", fo: ["Hjalmar Nilsonne", "Daniel Ek"], tags: ["Health", "Preventive"] },
  { n: "Function Health", d: "functionhealth.com", cat: "Health", reg: "US", st: "Growth", p: 3, b: "Comprehensive lab testing membership.", founded: 2021, hq: "Austin, USA", tags: ["Health", "Diagnostics"] },
  { n: "Commure", d: "commure.com", cat: "Health", reg: "US", st: "Late", p: 2, b: "AI operating system for healthcare.", founded: 2017, hq: "Mountain View, USA", tags: ["Health", "AI"] },
  { n: "Cedar", d: "cedar.com", cat: "Health", reg: "US", st: "Growth", p: 2, b: "Healthcare billing & payments.", founded: 2016, hq: "New York, USA", tags: ["Health", "Fintech"] },

  // ---------------- Bio ----------------
  { n: "Isomorphic Labs", d: "isomorphiclabs.com", cat: "Bio", reg: "Europe", st: "Growth", p: 3, b: "AI-driven drug discovery (DeepMind spinout).", founded: 2021, hq: "London, UK", fo: ["Demis Hassabis"], tags: ["Bio", "AI", "Drug Discovery"] },
  { n: "Xaira Therapeutics", d: "xaira.com", cat: "Bio", reg: "US", st: "Growth", p: 2, b: "AI-first drug discovery.", founded: 2023, hq: "South San Francisco, USA", tags: ["Bio", "AI"] },
  { n: "EvolutionaryScale", d: "evolutionaryscale.ai", cat: "Bio", reg: "US", st: "Growth", p: 2, b: "AI models for biology (ESM).", founded: 2024, hq: "New York, USA", tags: ["Bio", "AI"] },
  { n: "Formation Bio", d: "formation.bio", cat: "Bio", reg: "US", st: "Growth", p: 2, b: "AI-native drug development.", founded: 2016, hq: "New York, USA", tags: ["Bio", "AI"] },
  { n: "Tempus", d: "tempus.com", cat: "Bio", reg: "US", st: "Late", p: 3, b: "Precision medicine & genomic data.", founded: 2015, hq: "Chicago, USA", fo: ["Eric Lefkofsky"], tags: ["Bio", "Data", "Genomics"], cbh: "tempus" },

  // ---------------- Climate ----------------
  { n: "Helion", d: "helionenergy.com", cat: "Climate", reg: "US", st: "Growth", p: 3, b: "Fusion energy.", founded: 2013, hq: "Everett, USA", fo: ["David Kirtley"], tags: ["Climate", "Fusion", "Energy"], cbh: "helion-energy" },
  { n: "Commonwealth Fusion", d: "cfs.energy", cat: "Climate", reg: "US", st: "Growth", p: 3, b: "Commercial fusion power (MIT spinout).", founded: 2018, hq: "Devens, USA", tags: ["Climate", "Fusion", "Energy"], cbh: "commonwealth-fusion-systems" },
  { n: "Form Energy", d: "formenergy.com", cat: "Climate", reg: "US", st: "Growth", p: 3, b: "Long-duration iron-air batteries.", founded: 2017, hq: "Somerville, USA", tags: ["Climate", "Energy Storage"], cbh: "form-energy" },
  { n: "Redwood Materials", d: "redwoodmaterials.com", cat: "Climate", reg: "US", st: "Late", p: 3, b: "Battery recycling & materials.", founded: 2017, hq: "Carson City, USA", fo: ["JB Straubel"], tags: ["Climate", "Batteries", "Recycling"], cbh: "redwood-materials" },
  { n: "Crusoe", d: "crusoe.ai", cat: "Climate", reg: "US", st: "Late", p: 3, b: "Clean compute & AI infrastructure.", founded: 2018, hq: "San Francisco, USA", tags: ["Climate", "AI", "Energy"], cbh: "crusoe-energy-systems" },
  { n: "Sila Nanotechnologies", d: "silanano.com", cat: "Climate", reg: "US", st: "Late", p: 2, b: "Next-gen battery materials.", founded: 2011, hq: "Alameda, USA", tags: ["Climate", "Batteries"] },
  { n: "Electric Hydrogen", d: "eh2.com", cat: "Climate", reg: "US", st: "Growth", p: 2, b: "Green hydrogen production.", founded: 2020, hq: "Natick, USA", tags: ["Climate", "Hydrogen"] },
  { n: "Base Power", d: "basepowercompany.com", cat: "Climate", reg: "US", st: "Growth", p: 2, b: "Home batteries & distributed power.", founded: 2023, hq: "Austin, USA", tags: ["Climate", "Energy Storage"] },
  { n: "Twelve", d: "twelve.co", cat: "Climate", reg: "US", st: "Growth", p: 2, b: "Turning CO2 into chemicals & fuels.", founded: 2015, hq: "Berkeley, USA", tags: ["Climate", "Carbon"] },

  // ---------------- Hardware ----------------
  { n: "Anduril", d: "anduril.com", cat: "Space & Defense", reg: "US", st: "Late", p: 4, b: "Autonomous defense systems.", founded: 2017, hq: "Costa Mesa, USA", fo: ["Palmer Luckey", "Trae Stephens", "Brian Schimpf", "Matt Grimm", "Joe Chen"], tags: ["Defense", "Hardware", "AI"], cbh: "anduril-industries" },
  { n: "SpaceX", d: "spacex.com", cat: "Space & Defense", reg: "US", st: "Late", p: 5, b: "Rockets, Starlink & orbital internet.", desc: "Designs, manufactures and launches rockets and spacecraft; operates the Starlink satellite-internet constellation.", founded: 2002, hq: "Hawthorne, USA", emp: "10,001+", val: "$350B", fo: ["Elon Musk"], tags: ["Aerospace", "Space", "Satellites"], xh: "SpaceX", cbh: "space-exploration-technologies" },
  { n: "Relativity Space", d: "relativityspace.com", cat: "Space & Defense", reg: "US", st: "Late", p: 3, b: "3D-printed rockets.", founded: 2015, hq: "Long Beach, USA", fo: ["Tim Ellis", "Jordan Noone"], tags: ["Aerospace", "Space"], cbh: "relativity-space" },
  { n: "Rocket Lab", d: "rocketlabusa.com", cat: "Space & Defense", reg: "US", st: "Late", p: 3, b: "Small-launch rockets & space systems.", founded: 2006, hq: "Long Beach, USA", fo: ["Peter Beck"], tags: ["Aerospace", "Space"], cbh: "rocket-lab" },
  { n: "Shield AI", d: "shield.ai", cat: "Space & Defense", reg: "US", st: "Late", p: 3, b: "AI pilots for defense aircraft.", founded: 2015, hq: "San Diego, USA", tags: ["Defense", "AI"], cbh: "shield-ai" },
  { n: "Helsing", d: "helsing.ai", cat: "Space & Defense", reg: "Europe", st: "Growth", p: 3, b: "AI for defense (Europe).", founded: 2021, hq: "Munich, Germany", tags: ["Defense", "AI"] },
  { n: "Saronic", d: "saronic.com", cat: "Space & Defense", reg: "US", st: "Growth", p: 2, b: "Autonomous naval vessels.", founded: 2022, hq: "Austin, USA", tags: ["Defense", "Autonomy"] },
  { n: "Astranis", d: "astranis.com", cat: "Space & Defense", reg: "US", st: "Growth", p: 2, b: "Small geostationary comms satellites.", founded: 2015, hq: "San Francisco, USA", tags: ["Aerospace", "Satellites"] },
  { n: "Varda Space", d: "vardaspace.com", cat: "Space & Defense", reg: "US", st: "Growth", p: 2, b: "Manufacturing in space.", founded: 2021, hq: "El Segundo, USA", tags: ["Aerospace", "Manufacturing"] },
  { n: "Hadrian", d: "hadrian.co", cat: "Hardware", reg: "US", st: "Growth", p: 2, b: "Automated precision manufacturing.", founded: 2020, hq: "Los Angeles, USA", tags: ["Hardware", "Manufacturing"] },

  // ---------------- Robotics ----------------
  { n: "Figure", d: "figure.ai", cat: "Robotics", reg: "US", st: "Growth", p: 3, b: "Humanoid robots.", founded: 2022, hq: "Sunnyvale, USA", fo: ["Brett Adcock"], tags: ["Robotics", "AI", "Humanoids"] },
  { n: "Skild AI", d: "skild.ai", cat: "Robotics", reg: "US", st: "Growth", p: 2, b: "A foundation model for robotics.", founded: 2023, hq: "Pittsburgh, USA", tags: ["Robotics", "AI"] },
  { n: "1X", d: "1x.tech", cat: "Robotics", reg: "Europe", st: "Growth", p: 2, b: "Humanoid robots for the home.", founded: 2014, hq: "Moss, Norway", tags: ["Robotics", "Humanoids"] },
  { n: "Skydio", d: "skydio.com", cat: "Robotics", reg: "US", st: "Late", p: 3, b: "Autonomous drones.", founded: 2014, hq: "San Mateo, USA", tags: ["Robotics", "Drones"], cbh: "skydio" },
  { n: "Applied Intuition", d: "appliedintuition.com", cat: "Mobility", reg: "US", st: "Late", p: 3, b: "Software for autonomous vehicles.", founded: 2017, hq: "Mountain View, USA", tags: ["Mobility", "Autonomy"], cbh: "applied-intuition" },
  { n: "Waymo", d: "waymo.com", cat: "Mobility", reg: "US", st: "Late", p: 4, b: "Autonomous ride-hailing.", founded: 2009, hq: "Mountain View, USA", tags: ["Mobility", "Autonomy"], cbh: "waymo" },
  { n: "Wayve", d: "wayve.ai", cat: "Mobility", reg: "Europe", st: "Growth", p: 3, b: "Embodied AI for self-driving.", founded: 2017, hq: "London, UK", tags: ["Mobility", "AI", "Autonomy"] },
  { n: "Nuro", d: "nuro.ai", cat: "Mobility", reg: "US", st: "Late", p: 2, b: "Autonomous local delivery vehicles.", founded: 2016, hq: "Mountain View, USA", tags: ["Mobility", "Autonomy"], cbh: "nuro" },
  { n: "Bolt", d: "bolt.eu", cat: "Mobility", reg: "Europe", st: "Late", p: 3, b: "Ride-hailing & mobility super-app.", founded: 2013, hq: "Tallinn, Estonia", fo: ["Markus Villig"], tags: ["Mobility", "Ride-hailing"], cbh: "bolt-3" },

  // ---------------- Proptech ----------------
  { n: "Pacaso", d: "pacaso.com", cat: "Proptech", reg: "US", st: "Late", p: 2, b: "Co-ownership of second homes.", founded: 2020, hq: "San Francisco, USA", fo: ["Austin Allison", "Spencer Rascoff"], tags: ["Proptech", "Real Estate"] },
  { n: "EliseAI", d: "eliseai.com", cat: "Proptech", reg: "US", st: "Growth", p: 2, b: "AI assistants for housing & healthcare.", founded: 2017, hq: "New York, USA", tags: ["Proptech", "AI"] },

  // ---------------- Edtech ----------------
  { n: "Multiverse", d: "multiverse.io", cat: "Edtech", reg: "Europe", st: "Late", p: 2, b: "Apprenticeships as an alternative to college.", founded: 2016, hq: "London, UK", fo: ["Euan Blair"], tags: ["Edtech", "Careers"] },
  { n: "Brilliant", d: "brilliant.org", cat: "Edtech", reg: "US", st: "Growth", p: 2, b: "Interactive STEM learning.", founded: 2012, hq: "San Francisco, USA", tags: ["Edtech", "STEM"] },
  { n: "Speak", d: "speak.com", cat: "Edtech", reg: "US", st: "Growth", p: 3, b: "AI language tutor.", founded: 2016, hq: "San Francisco, USA", tags: ["Edtech", "AI", "Language"] },

  // ---------------- Media & Gaming ----------------
  { n: "Sorare", d: "sorare.com", cat: "Media & Gaming", reg: "Europe", st: "Late", p: 3, b: "Fantasy sports with digital cards.", founded: 2018, hq: "Paris, France", tags: ["Gaming", "Sports", "Web3"], cbh: "sorare" },
  { n: "Lovable", d: "lovable.dev", cat: "AI", reg: "Europe", st: "Growth", p: 3, b: "Build apps by chatting with AI.", founded: 2023, hq: "Stockholm, Sweden", fo: ["Anton Osika"], tags: ["AI", "No-code", "Developer Tools"] },

  // ---------------- LatAm ----------------
  { n: "Nubank", d: "nubank.com.br", cat: "Fintech", reg: "LatAm", st: "Late", p: 5, b: "Digital banking for Latin America.", desc: "Latin America's largest digital bank, serving 100M+ customers across Brazil, Mexico and Colombia. Public: NYSE: NU.", founded: 2013, hq: "São Paulo, Brazil", emp: "5,001–10,000", val: "~$60B (public)", fo: ["David Vélez", "Cristina Junqueira", "Edward Wible"], tags: ["Fintech", "Neobank", "LatAm"], xh: "nubank", cbh: "nubank" },
  { n: "MercadoLibre", d: "mercadolibre.com", cat: "Commerce", reg: "LatAm", st: "Late", p: 5, b: "Latin America's e-commerce & fintech giant.", founded: 1999, hq: "Buenos Aires, Argentina", fo: ["Marcos Galperin"], tags: ["Commerce", "Fintech", "LatAm"], cbh: "mercadolibre" },
  { n: "Rappi", d: "rappi.com", cat: "Commerce", reg: "LatAm", st: "Late", p: 4, b: "Latin America's delivery super-app.", founded: 2015, hq: "Bogotá, Colombia", fo: ["Simón Borrero", "Sebastián Mejía", "Felipe Villamarín"], tags: ["Commerce", "Delivery", "LatAm"], cbh: "rappi" },
  { n: "Kavak", d: "kavak.com", cat: "Commerce", reg: "LatAm", st: "Late", p: 3, b: "Buy & sell used cars online.", founded: 2016, hq: "Mexico City, Mexico", fo: ["Carlos García Ottati"], tags: ["Commerce", "Autos", "LatAm"], cbh: "kavak" },
  { n: "dLocal", d: "dlocal.com", cat: "Fintech", reg: "LatAm", st: "Late", p: 3, b: "Payments for emerging markets.", founded: 2016, hq: "Montevideo, Uruguay", tags: ["Fintech", "Payments", "LatAm"], cbh: "dlocal" },
  { n: "Clip", d: "clip.mx", cat: "Fintech", reg: "LatAm", st: "Growth", p: 3, b: "Payments & card readers in Mexico.", founded: 2012, hq: "Mexico City, Mexico", tags: ["Fintech", "Payments", "LatAm"], cbh: "clip" },
  { n: "Bitso", d: "bitso.com", cat: "Crypto", reg: "LatAm", st: "Late", p: 3, b: "Latin America's crypto platform.", founded: 2014, hq: "Mexico City, Mexico", tags: ["Crypto", "LatAm"], cbh: "bitso" },
  { n: "Ualá", d: "uala.com.ar", cat: "Fintech", reg: "LatAm", st: "Late", p: 3, b: "Financial super-app in Argentina.", founded: 2017, hq: "Buenos Aires, Argentina", fo: ["Pierpaolo Barbieri"], tags: ["Fintech", "Neobank", "LatAm"], cbh: "uala" },
  { n: "Creditas", d: "creditas.com", cat: "Fintech", reg: "LatAm", st: "Late", p: 3, b: "Secured consumer lending in Brazil.", founded: 2012, hq: "São Paulo, Brazil", tags: ["Fintech", "Lending", "LatAm"], cbh: "creditas" },
  { n: "Nuvemshop", d: "nuvemshop.com.br", cat: "Commerce", reg: "LatAm", st: "Growth", p: 3, b: "E-commerce platform for LatAm (Tiendanube).", founded: 2011, hq: "São Paulo, Brazil", tags: ["Commerce", "E-commerce", "LatAm"], cbh: "tiendanube" },
  { n: "Wildlife Studios", d: "wildlifestudios.com", cat: "Media & Gaming", reg: "LatAm", st: "Late", p: 3, b: "Mobile game developer.", founded: 2011, hq: "São Paulo, Brazil", fo: ["Victor Lazarte", "Arthur Lazarte"], tags: ["Gaming", "Mobile", "LatAm"], cbh: "wildlife-studios" },
  { n: "CloudWalk", d: "cloudwalk.io", cat: "Fintech", reg: "LatAm", st: "Late", p: 2, b: "Payments & AI for merchants (InfinitePay).", founded: 2013, hq: "São Paulo, Brazil", tags: ["Fintech", "Payments", "LatAm"] },
  { n: "Wellhub", d: "wellhub.com", cat: "Consumer", reg: "LatAm", st: "Late", p: 3, b: "Corporate wellness (formerly Gympass).", founded: 2012, hq: "São Paulo, Brazil", tags: ["Consumer", "Wellness", "LatAm"], cbh: "gympass" },
  { n: "NotCo", d: "notco.com", cat: "Consumer", reg: "LatAm", st: "Growth", p: 2, b: "AI-designed plant-based food.", founded: 2015, hq: "Santiago, Chile", tags: ["Consumer", "Food", "AI", "LatAm"], cbh: "notco" },
  { n: "Clara", d: "clara.com", cat: "Fintech", reg: "LatAm", st: "Growth", p: 2, b: "Corporate cards & spend for LatAm.", founded: 2020, hq: "Mexico City, Mexico", tags: ["Fintech", "Corporate Cards", "LatAm"] },
  { n: "Kushki", d: "kushki.com", cat: "Fintech", reg: "LatAm", st: "Growth", p: 2, b: "Payments infrastructure for LatAm.", founded: 2017, hq: "Quito, Ecuador", tags: ["Fintech", "Payments", "LatAm"], cbh: "kushki" },
  { n: "Belvo", d: "belvo.com", cat: "Fintech", reg: "LatAm", st: "Growth", p: 2, b: "Open finance API for LatAm.", founded: 2019, hq: "Mexico City, Mexico", tags: ["Fintech", "Open Banking", "LatAm"], cbh: "belvo" },
  { n: "Pomelo", d: "pomelo.la", cat: "Fintech", reg: "LatAm", st: "Growth", p: 2, b: "Card issuing & fintech infrastructure.", founded: 2021, hq: "Buenos Aires, Argentina", tags: ["Fintech", "Infrastructure", "LatAm"] },
  { n: "Bold", d: "bold.co", cat: "Fintech", reg: "LatAm", st: "Growth", p: 2, b: "Payments for small merchants in Colombia.", founded: 2019, hq: "Bogotá, Colombia", tags: ["Fintech", "Payments", "LatAm"] },
  { n: "Addi", d: "addi.com", cat: "Fintech", reg: "LatAm", st: "Growth", p: 2, b: "Buy now, pay later in Latin America.", founded: 2018, hq: "Bogotá, Colombia", tags: ["Fintech", "BNPL", "LatAm"] },
  { n: "Loft", d: "loft.com.br", cat: "Proptech", reg: "LatAm", st: "Late", p: 2, b: "Digital real estate in Brazil.", founded: 2018, hq: "São Paulo, Brazil", tags: ["Proptech", "LatAm"], cbh: "loft" },
  { n: "QuintoAndar", d: "quintoandar.com.br", cat: "Proptech", reg: "LatAm", st: "Late", p: 3, b: "Rent & buy homes online in Brazil.", founded: 2013, hq: "São Paulo, Brazil", fo: ["Gabriel Braga", "André Penha"], tags: ["Proptech", "LatAm"], cbh: "quintoandar" },
  { n: "Habi", d: "habi.co", cat: "Proptech", reg: "LatAm", st: "Growth", p: 2, b: "Buy & sell homes in Colombia & Mexico.", founded: 2019, hq: "Bogotá, Colombia", tags: ["Proptech", "LatAm"] },
  { n: "Nowports", d: "nowports.com", cat: "Logistics", reg: "LatAm", st: "Growth", p: 2, b: "Digital freight forwarder for LatAm.", founded: 2018, hq: "Monterrey, Mexico", tags: ["Logistics", "LatAm"], cbh: "nowports" },
  { n: "Merama", d: "merama.io", cat: "Commerce", reg: "LatAm", st: "Growth", p: 2, b: "Building LatAm's next e-commerce brands.", founded: 2020, hq: "Mexico City, Mexico", tags: ["Commerce", "LatAm"] },
  { n: "Konfío", d: "konfio.mx", cat: "Fintech", reg: "LatAm", st: "Growth", p: 2, b: "Lending & banking for Mexican SMEs.", founded: 2013, hq: "Mexico City, Mexico", tags: ["Fintech", "SME", "LatAm"], cbh: "konfio" },
  { n: "Fintual", d: "fintual.com", cat: "Fintech", reg: "LatAm", st: "Growth", p: 2, b: "Automated investing in Chile & Mexico.", founded: 2018, hq: "Santiago, Chile", tags: ["Fintech", "Investing", "LatAm"] },
  { n: "Betterfly", d: "betterfly.com", cat: "Fintech", reg: "LatAm", st: "Growth", p: 2, b: "Wellness-linked insurance benefits.", founded: 2018, hq: "Santiago, Chile", tags: ["Fintech", "Insurance", "LatAm"] },
  { n: "Hotmart", d: "hotmart.com", cat: "SaaS", reg: "LatAm", st: "Late", p: 2, b: "Platform for creators & digital products.", founded: 2011, hq: "Belo Horizonte, Brazil", tags: ["SaaS", "Creators", "LatAm"], cbh: "hotmart" },

  // ---------------- India ----------------
  { n: "Razorpay", d: "razorpay.com", cat: "Fintech", reg: "India", st: "Late", p: 3, b: "Payments & banking for Indian businesses.", founded: 2014, hq: "Bengaluru, India", fo: ["Harshil Mathur", "Shashank Kumar"], tags: ["Fintech", "Payments", "India"], cbh: "razorpay" },
  { n: "Zerodha", d: "zerodha.com", cat: "Fintech", reg: "India", st: "Late", p: 3, b: "India's largest retail stockbroker.", founded: 2010, hq: "Bengaluru, India", fo: ["Nithin Kamath", "Nikhil Kamath"], tags: ["Fintech", "Investing", "India"], cbh: "zerodha" },
  { n: "CRED", d: "cred.club", cat: "Fintech", reg: "India", st: "Late", p: 3, b: "Rewards & payments for creditworthy Indians.", founded: 2018, hq: "Bengaluru, India", fo: ["Kunal Shah"], tags: ["Fintech", "Consumer", "India"], cbh: "cred" },
  { n: "Meesho", d: "meesho.com", cat: "Commerce", reg: "India", st: "Late", p: 3, b: "Social commerce for India.", founded: 2015, hq: "Bengaluru, India", tags: ["Commerce", "Social", "India"], cbh: "meesho" },
  { n: "Groww", d: "groww.in", cat: "Fintech", reg: "India", st: "Late", p: 3, b: "Investing app for India.", founded: 2016, hq: "Bengaluru, India", tags: ["Fintech", "Investing", "India"], cbh: "groww" },
  { n: "Zepto", d: "zeptonow.com", cat: "Commerce", reg: "India", st: "Late", p: 3, b: "10-minute grocery delivery.", founded: 2021, hq: "Mumbai, India", fo: ["Aadit Palicha", "Kaivalya Vohra"], tags: ["Commerce", "Delivery", "India"], cbh: "zepto" },
  { n: "BrowserStack", d: "browserstack.com", cat: "Dev Tools", reg: "India", st: "Late", p: 2, b: "Cross-browser testing platform.", founded: 2011, hq: "Mumbai, India", tags: ["Developer Tools", "Testing", "India"], cbh: "browserstack" },
  { n: "Lenskart", d: "lenskart.com", cat: "Commerce", reg: "India", st: "Late", p: 3, b: "Omnichannel eyewear retailer.", founded: 2010, hq: "Gurugram, India", fo: ["Peyush Bansal"], tags: ["Commerce", "Retail", "India"], cbh: "lenskart" },

  // ---------------- More ----------------
  { n: "Rippling", d: "rippling.com", cat: "SaaS", reg: "US", st: "Late", p: 4, b: "HR, IT & finance in one system.", desc: "A workforce-management platform unifying HR, IT and finance — payroll, benefits, devices and apps.", founded: 2016, hq: "San Francisco, USA", val: "$16.8B", fo: ["Parker Conrad", "Prasanna Sankar"], tags: ["SaaS", "HR", "IT Management"], cbh: "rippling" },
  { n: "Cognition", d: "cognition.ai", cat: "AI", reg: "US", st: "Growth", p: 3, b: "Maker of Devin, the AI software engineer.", founded: 2023, hq: "San Francisco, USA", tags: ["Artificial Intelligence", "Developer Tools", "Agents"] },
  { n: "Gong", d: "gong.io", cat: "SaaS", reg: "US", st: "Late", p: 3, b: "Revenue intelligence from customer conversations.", founded: 2015, hq: "San Francisco, USA", fo: ["Amit Bendov", "Eilon Reshef"], tags: ["SaaS", "Sales", "AI"], cbh: "gong-io" },
  { n: "Bilt Rewards", d: "biltrewards.com", cat: "Fintech", reg: "US", st: "Late", p: 3, b: "Rewards for paying rent.", founded: 2019, hq: "New York, USA", fo: ["Ankur Jain"], tags: ["Fintech", "Rewards", "Consumer"], cbh: "bilt-rewards" },
  { n: "Modern Treasury", d: "moderntreasury.com", cat: "Fintech", reg: "US", st: "Growth", p: 2, b: "Payment operations software.", founded: 2018, hq: "San Francisco, USA", tags: ["Fintech", "Payments", "Infrastructure"], cbh: "modern-treasury" },
  { n: "Frubana", d: "frubana.com", cat: "Commerce", reg: "LatAm", st: "Growth", p: 2, b: "B2B marketplace supplying restaurants in LatAm.", founded: 2018, hq: "Bogotá, Colombia", tags: ["Commerce", "B2B", "LatAm"], cbh: "frubana" },
  { n: "Stori", d: "storicard.com", cat: "Fintech", reg: "LatAm", st: "Growth", p: 2, b: "Credit cards for underbanked Mexicans.", founded: 2018, hq: "Mexico City, Mexico", tags: ["Fintech", "Credit", "LatAm"], cbh: "stori" },
];
