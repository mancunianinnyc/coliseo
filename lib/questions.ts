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
// (money on the line / hype vs. substance / would you actually quit) so matchups
// generate debate — and so unknown companies can genuinely win.
export const QUESTIONS: Record<QKey, Question> = {
  V: {
    key: "V",
    label: "Conviction",
    chip: "🚀 Would 10x",
    emoji: "🚀",
    q: "Which would you <span>10x your money</span> on?",
    verb: "who I'd 10x on",
  },
  G: {
    key: "G",
    label: "Momentum",
    chip: "🔥 Actually winning",
    emoji: "🔥",
    q: "Which is <span>actually winning</span> right now?",
    verb: "who's actually winning",
  },
  D: {
    key: "D",
    label: "Talent",
    chip: "🏃 Quit to join",
    emoji: "🏃",
    q: "Which would you <span>quit your job</span> to join?",
    verb: "who I'd quit for",
  },
};

// The daily set walks the user through one pick per dimension, in this order.
export const QORDER: QKey[] = ["V", "G", "D"];
