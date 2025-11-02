// lib/tags/constants.ts
export type Sentiment = 'good' | 'bad';
export type TagSource = 'user' | 'preset';

export const PRESET_TAGS: { label: string; sentiment: Sentiment; source: TagSource }[] = [
  { label: 'milk tea', sentiment: 'bad', source: 'preset' },
  { label: 'spicy food', sentiment: 'bad', source: 'preset' },
  { label: 'cheese', sentiment: 'bad', source: 'preset' },
  { label: 'fried chicken', sentiment: 'bad', source: 'preset' },
  { label: 'soda', sentiment: 'bad', source: 'preset' },
  { label: 'coffee', sentiment: 'bad', source: 'preset' },
  { label: 'chocolate', sentiment: 'bad', source: 'preset' },
  { label: 'pizza', sentiment: 'bad', source: 'preset' },
  { label: 'ice cream', sentiment: 'bad', source: 'preset' },
  { label: 'alcohol', sentiment: 'bad', source: 'preset' },
];

export const BAD_WORDS = [
  'spicy','chili','hotpot','hot pot','pepper','szechuan','mala',
  'fried','oily','greasy','sugar','soda','cola','dessert','sweet',
  'milk tea','milk','dairy','cheese','yogurt',
  'alcohol','beer','wine','soju',
  'nuts','peanut','cashew',
  'chocolate','cocoa','caffeine','coffee','espresso','matcha',
  'ramen','instant noodle'
];

export const GOOD_WORDS = [
  'vitamin c','vit c','vitamin a','zinc','omega-3','green tea',
  'retinol','tretinoin','differin','adapalene','benzoyl peroxide',
  'niacinamide','azelaic','salicylic','bha','aha',
  'accutane','isotretinoin'
];

export const norm = (s: string) => s.trim().toLowerCase();
export const tagIdOf = (label: string) => norm(label).replace(/\s+/g, '_');

export function guessSentiment(label: string): Sentiment {
  const s = norm(label);
  if (BAD_WORDS.some(w => s.includes(w))) return 'bad';
  if (GOOD_WORDS.some(w => s.includes(w))) return 'good';
  return 'good';
}

