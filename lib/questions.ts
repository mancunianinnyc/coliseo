import type { QKey } from "./types";

export interface Question {
  key: QKey;
  label: string; // table name
  chip: string; // short chip label
  emoji: string;
  q: string; // hero question (with a <span> around the highlighted phrase)
  verb: string; // used in the share card: "I called {verb}"
}

export const QUESTIONS: Record<QKey, Question> = {
  V: {
    key: "V",
    label: "Value",
    chip: "💰 Worth more",
    emoji: "💰",
    q: "Which will be <span>worth more</span> in 10 years?",
    verb: "who'll be worth more",
  },
  G: {
    key: "G",
    label: "Growth",
    chip: "📈 Grows faster",
    emoji: "📈",
    q: "Which will <span>grow faster</span> this year?",
    verb: "who'll grow faster",
  },
  D: {
    key: "D",
    label: "Workplace",
    chip: "💼 Rather work at",
    emoji: "💼",
    q: "Which would you <span>rather work at</span> for the next 10 years?",
    verb: "where I'd rather work",
  },
};

// The daily set walks the user through one pick per dimension, in this order.
export const QORDER: QKey[] = ["V", "G", "D"];
