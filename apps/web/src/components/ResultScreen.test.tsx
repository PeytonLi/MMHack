import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResultScreen } from '@/components/ResultScreen';

const { getRecipeRecommendations, sendRecipeAssistantMessage } = vi.hoisted(() => ({
  getRecipeRecommendations: vi.fn(),
  sendRecipeAssistantMessage: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  getRecipeRecommendations,
  sendRecipeAssistantMessage,
}));

describe('ResultScreen', () => {
  it('shows the mismatch state and skips recipe loading when the fruit is wrong', () => {
    render(
      <ResultScreen
        analysis={{
          status: 'fruit_mismatch',
          sku: 'banana',
          detectedSku: 'tomato',
          confidence: 'high',
          rationale: 'The selected fruit is banana, but this image is a green tomato.',
          visibleIssues: ['round shape', 'green tomato skin'],
        }}
        image="data:image/jpeg;base64,abc123"
        onReset={() => {}}
      />,
    );

    expect(screen.getByText('Wrong Fruit')).toBeInTheDocument();
    expect(screen.getByText('Wrong Fruit Detected')).toBeInTheDocument();
    expect(screen.getByText('Wrong Produce Alert')).toBeInTheDocument();
    expect(
      screen.getAllByText(/you picked banana, but this scan looks more like tomato/i),
    ).toHaveLength(2);
    expect(screen.queryByText('Freshness Score')).not.toBeInTheDocument();
    expect(getRecipeRecommendations).not.toHaveBeenCalled();
  });

  it('shows nutrition facts, cook time, and servings for recipe cards', async () => {
    getRecipeRecommendations.mockResolvedValueOnce({
      status: 'ok',
      fruitName: 'banana',
      reasoning: 'Firm bananas work better in savory or starchy recipes.',
      ripenessBand: 'underripe',
      ripenessScore: 2,
      recipes: [
        {
          id: 42,
          title: 'Garlic & Spice Plantain Chips',
          reason: 'Underripe bananas fit chip-style recipes better than desserts.',
          ripenessFit: 'underripe',
          readyInMinutes: 30,
          servings: 6,
          nutrition: {
            calories: 170,
            protein: 2,
            carbs: 28,
            fat: 6,
            fiber: 4,
          },
        },
      ],
    });

    render(
      <ResultScreen
        analysis={{
          status: 'ok',
          sku: 'banana',
          score: 2,
          confidence: 'high',
          rationale: 'Green peel and firm structure indicate underripe fruit.',
          visibleIssues: ['green peel'],
          ripenessBand: 'underripe',
        }}
        image="data:image/jpeg;base64,abc123"
        onReset={() => {}}
      />,
    );

    expect(await screen.findByText('Garlic & Spice Plantain Chips')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
    expect(screen.getByText('Serves 6')).toBeInTheDocument();
    expect(screen.getByText('Cal')).toBeInTheDocument();
    expect(screen.getByText('170')).toBeInTheDocument();
    expect(screen.getByText('Protein')).toBeInTheDocument();
    expect(screen.getByText('2g')).toBeInTheDocument();
    expect(screen.getByText('Carbs')).toBeInTheDocument();
    expect(screen.getByText('28g')).toBeInTheDocument();
    expect(screen.getByText('Fat')).toBeInTheDocument();
    expect(screen.getByText('6g')).toBeInTheDocument();
    expect(screen.getByText('Fiber')).toBeInTheDocument();
    expect(screen.getByText('4g')).toBeInTheDocument();
  });
});
