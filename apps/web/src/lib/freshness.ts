import { FreshnessAnalysis, SkuInfo, SupportedSku } from '@/types/freshness';

export const SKU_DATA: Record<SupportedSku, SkuInfo> = {
  banana: {
    sku: 'banana',
    label: 'Banana',
    emoji: '🍌',
    description: 'Cavendish banana',
  },
  apple: {
    sku: 'apple',
    label: 'Apple',
    emoji: '🍎',
    description: 'Red delicious apple',
  },
  tomato: {
    sku: 'tomato',
    label: 'Tomato',
    emoji: '🍅',
    description: 'Roma tomato',
  },
};

export function getFreshnessLabel(score: number): string {
  if (score >= 9) return 'Very Fresh';
  if (score >= 7) return 'Fresh';
  if (score >= 5) return 'Ripe';
  if (score >= 3) return 'Overripe';
  return 'Past Prime';
}

export function getFreshnessColor(score: number): string {
  if (score >= 9) return 'bg-freshness-fresh';
  if (score >= 7) return 'bg-freshness-ripe';
  if (score >= 5) return 'bg-freshness-aging';
  if (score >= 3) return 'bg-freshness-overripe';
  return 'bg-freshness-spoiled';
}

export function getFreshnessTextColor(score: number): string {
  if (score >= 9) return 'freshness-fresh';
  if (score >= 7) return 'freshness-ripe';
  if (score >= 5) return 'freshness-aging';
  if (score >= 3) return 'freshness-overripe';
  return 'freshness-spoiled';
}

export function getRipenessDescription(sku: SupportedSku, score: number): string {
  if (score >= 7) return `This ${sku} is fresh — great for eating raw or in fresh dishes.`;
  if (score >= 4) return `This ${sku} is nicely ripe — ideal for cooking and baking.`;
  return `This ${sku} is very ripe — perfect for recipes that benefit from maximum sweetness and soft texture.`;
}
