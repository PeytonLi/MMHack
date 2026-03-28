import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RecipeAssistant } from '@/components/RecipeAssistant';

const { sendRecipeAssistantMessage } = vi.hoisted(() => ({
  sendRecipeAssistantMessage: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  sendRecipeAssistantMessage,
}));

describe('RecipeAssistant', () => {
  it('sends a chat turn and applies returned recipes', async () => {
    const onApplyRecipes = vi.fn();
    sendRecipeAssistantMessage.mockResolvedValueOnce({
      status: 'ok',
      reply: 'I found a faster high-protein banana recipe.',
      appliedConstraints: ['high protein', 'under 30 minutes'],
      recipes: [
        {
          id: 8,
          title: 'Banana Oat Protein Pancakes',
          reason: 'This grounded match is quicker and higher in protein.',
          ripenessFit: 'ripe',
        },
      ],
    });

    render(
      <RecipeAssistant
        analysis={{
          status: 'ok',
          sku: 'banana',
          score: 6,
          confidence: 'high',
          visibleIssues: ['yellow peel'],
          rationale: 'Mostly yellow peel with a few freckles.',
          ripenessBand: 'ripe',
        }}
        onApplyRecipes={onApplyRecipes}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /open recipe assistant/i }));
    fireEvent.change(screen.getByPlaceholderText(/ask for a new recipe direction/i), {
      target: { value: 'Make it high protein and under 30 minutes.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /ask assistant/i }));

    await screen.findByText('I found a faster high-protein banana recipe.');
    expect(onApplyRecipes).toHaveBeenCalledWith([
      expect.objectContaining({ title: 'Banana Oat Protein Pancakes' }),
    ]);
    expect(await screen.findByText('high protein')).toBeInTheDocument();
    expect(screen.getByText('under 30 minutes')).toBeInTheDocument();
  });

  it('shows an unavailable-state message without applying recipes', async () => {
    const onApplyRecipes = vi.fn();
    sendRecipeAssistantMessage.mockResolvedValueOnce({
      status: 'assistant_unavailable',
      message: 'Recipe assistant is temporarily unavailable. Try again in a bit.',
    });

    render(
      <RecipeAssistant
        analysis={{
          status: 'ok',
          sku: 'banana',
          score: 6,
          confidence: 'high',
          visibleIssues: ['yellow peel'],
          rationale: 'Mostly yellow peel with a few freckles.',
          ripenessBand: 'ripe',
        }}
        onApplyRecipes={onApplyRecipes}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /open recipe assistant/i }));
    fireEvent.click(screen.getByRole('button', { name: /make it vegan/i }));

    await waitFor(() => {
      expect(screen.getByText('Recipe assistant is temporarily unavailable. Try again in a bit.')).toBeInTheDocument();
    });
    expect(onApplyRecipes).not.toHaveBeenCalled();
  });
});
