import { SkuInfo, SupportedSku } from '@/types/freshness';

export const SKU_DATA: Record<SupportedSku, SkuInfo> = {
  banana: { sku: 'banana', label: 'Banana', emoji: '🍌', description: 'Cavendish banana' },
  apple: { sku: 'apple', label: 'Apple', emoji: '🍎', description: 'Red delicious apple' },
  tomato: { sku: 'tomato', label: 'Tomato', emoji: '🍅', description: 'Roma tomato' },
  avocado: { sku: 'avocado', label: 'Avocado', emoji: '🥑', description: 'Hass avocado' },
  strawberry: { sku: 'strawberry', label: 'Strawberry', emoji: '🍓', description: 'Fresh strawberry' },
  mango: { sku: 'mango', label: 'Mango', emoji: '🥭', description: 'Ataulfo mango' },
  peach: { sku: 'peach', label: 'Peach', emoji: '🍑', description: 'Yellow peach' },
  pear: { sku: 'pear', label: 'Pear', emoji: '🍐', description: 'Bartlett pear' },
  pineapple: { sku: 'pineapple', label: 'Pineapple', emoji: '🍍', description: 'Golden pineapple' },
  lettuce: { sku: 'lettuce', label: 'Lettuce', emoji: '🥬', description: 'Romaine lettuce' },
  bell_pepper: { sku: 'bell_pepper', label: 'Bell Pepper', emoji: '🫑', description: 'Green bell pepper' },
  broccoli: { sku: 'broccoli', label: 'Broccoli', emoji: '🥦', description: 'Fresh broccoli' },
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

export function getFruitMismatchMessage(
  selectedSku: SupportedSku,
  detectedSku: SupportedSku | null,
): string {
  if (detectedSku) {
    return `Plot twist: you picked ${selectedSku}, but this scan looks more like ${detectedSku}. Use the real ${selectedSku} or switch the selected fruit and try again.`;
  }

  return `Plot twist: this scan does not look like the selected ${selectedSku}. Use the real ${selectedSku} or switch the selected fruit and try again.`;
}
