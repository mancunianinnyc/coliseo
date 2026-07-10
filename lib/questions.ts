import type { QKey } from "./types";

export interface Question {
  key: QKey;
  label: string; // table name
  chip: string; // short chip label
  emoji: string;
  q: string; // hero question (with a <span> around the highlighted phrase)
  verb: string; // used in the share card: "I called {verb}"
}

// The three lenses are deliberately provocative and size-de-biased: the answer
// should never just be "the bigger company." Each forces a real, arguable call
// (your whole net worth on the line / who's winning right now / where the best
// people actually want to be) so matchups generate debate — and so unknown
// companies can genuinely win.
export const QUESTIONS: Record<QKey, Question> = {
  V: {
    key: "V",
    label: "Conviction",
    chip: "💰 All-in on",
    emoji: "💰",
    q: "Your <span>entire net worth</span>, one company, 10 years — which?",
    verb: "who I'd go all-in on",
  },
  G: {
    key: "G",
    label: "Momentum",
    chip: "🔥 Winning now",
    emoji: "🔥",
    q: "Which one is <span>winning</span> right now?",
    verb: "who's winning",
  },
  D: {
    key: "D",
    label: "Talent",
    chip: "🧲 Killer talent",
    emoji: "🧲",
    q: "Which one does <span>killer talent</span> want to work for?",
    verb: "who killer talent wants",
  },
};

// The daily set walks the user through one pick per dimension, in this order.
export const QORDER: QKey[] = ["V", "G", "D"];
