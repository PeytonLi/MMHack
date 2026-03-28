import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ResultScreen } from '@/components/ResultScreen';

const { getRecipeRecommendations } = vi.hoisted(() => ({
  getRecipeRecommendations: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  getRecipeRecommendations,
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
});
