import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, ChefHat, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BackendRecipe, FreshnessAnalysis } from '@/types/freshness';
import { RecipeAssistant } from '@/components/RecipeAssistant';
import {
  getFreshnessColor,
  getFreshnessLabel,
  getFreshnessTextColor,
  getFruitMismatchMessage,
  getRipenessDescription,
  SKU_DATA,
} from '@/lib/freshness';
import { getRecipeRecommendations } from '@/lib/api';

interface ResultScreenProps {
  analysis: FreshnessAnalysis;
  image: string;
  onReset: () => void;
}

export function ResultScreen({ analysis, image, onReset }: ResultScreenProps) {
  const skuInfo = SKU_DATA[analysis.sku];
  const isMismatch = analysis.status === 'fruit_mismatch';
  const mismatchMessage = isMismatch
    ? getFruitMismatchMessage(analysis.sku, analysis.detectedSku)
    : null;

  const label = !isMismatch ? getFreshnessLabel(analysis.score) : null;
  const barColor = !isMismatch ? getFreshnessColor(analysis.score) : null;
  const textColor = !isMismatch ? getFreshnessTextColor(analysis.score) : null;
  const ripenessDesc = !isMismatch ? getRipenessDescription(analysis.sku, analysis.score) : null;

  const [recipes, setRecipes] = useState<BackendRecipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(!isMismatch);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [recipeMismatchMessage, setRecipeMismatchMessage] = useState<string | null>(mismatchMessage);

  useEffect(() => {
    if (analysis.status === 'fruit_mismatch') {
      setRecipes([]);
      setLoadingRecipes(false);
      setRecipeError(null);
      setRecipeMismatchMessage(getFruitMismatchMessage(analysis.sku, analysis.detectedSku));
      return;
    }

    setLoadingRecipes(true);
    setRecipeError(null);
    setRecipeMismatchMessage(null);
    getRecipeRecommendations(analysis.sku, analysis)
      .then((resp) => {
        if (resp.status === 'fruit_mismatch') {
          setRecipes([]);
          setRecipeMismatchMessage(getFruitMismatchMessage(resp.selectedFruit, resp.detectedFruit));
          return;
        }

        setRecipes(resp.recipes);
      })
      .catch((err) => setRecipeError(err instanceof Error ? err.message : 'Failed to load recipes'))
      .finally(() => setLoadingRecipes(false));
  }, [analysis, image]);

  return (
    <div className="flex flex-col gap-6 px-6 py-8 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onReset}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-bold">Analysis Result</h2>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden"
        style={{ boxShadow: 'var(--shadow-elevated)' }}
      >
        <img src={image} alt={skuInfo.label} className="w-full aspect-[4/3] object-cover" />
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-foreground/80 to-transparent p-6">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-3xl">{skuInfo.emoji}</span>
              <h3 className="text-2xl font-bold text-primary-foreground">{skuInfo.label}</h3>
            </div>
            {isMismatch ? (
              <div className="rounded-full bg-destructive/90 px-3 py-1 text-sm font-semibold text-destructive-foreground">
                Wrong Fruit
              </div>
            ) : (
              <div className="text-right">
                <div className={`text-5xl font-bold font-serif ${textColor}`}>{analysis.score}</div>
                <div className="text-primary-foreground/80 text-sm font-medium">{label}</div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {!isMismatch && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Freshness Score</span>
            <span className="font-semibold">{analysis.score}/10 · {analysis.confidence} confidence</span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${analysis.score * 10}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${barColor}`}
            />
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-4 rounded-xl bg-card border border-border space-y-2"
      >
        <h4 className="font-semibold text-sm">{isMismatch ? 'Wrong Fruit Detected' : 'AI Assessment'}</h4>
        <p className="text-sm text-muted-foreground">{analysis.rationale}</p>
        <p className="text-sm text-primary font-medium">{isMismatch ? mismatchMessage : ripenessDesc}</p>
        {analysis.visibleIssues.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {analysis.visibleIssues.map((issue) => (
              <span key={issue} className="px-2 py-0.5 text-xs rounded-full bg-accent/10 text-accent font-medium">
                {issue}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2">
          {recipeMismatchMessage ? (
            <AlertTriangle className="w-5 h-5 text-destructive" />
          ) : (
            <ChefHat className="w-5 h-5 text-primary" />
          )}
          <h4 className="font-bold text-lg">
            {recipeMismatchMessage ? 'Wrong Produce Alert' : 'Recipe Ideas'}
          </h4>
        </div>
        <p className="text-sm text-muted-foreground -mt-1">
          {recipeMismatchMessage
            ? 'No recipes until the selected fruit matches the photo.'
            : 'AI-selected recipes matched to this ripeness level:'}
        </p>

        {recipeMismatchMessage ? (
          <div className="p-4 rounded-xl border border-dashed border-destructive/40 bg-destructive/5 text-sm text-muted-foreground">
            {recipeMismatchMessage}
          </div>
        ) : loadingRecipes ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Finding recipes...</span>
          </div>
        ) : recipeError ? (
          <div className="p-4 rounded-xl bg-card border border-border text-center text-sm text-muted-foreground">
            Could not load recipes: {recipeError}
          </div>
        ) : recipes.length === 0 ? (
          <div className="p-4 rounded-xl bg-card border border-border text-center text-sm text-muted-foreground">
            No recipes found for this ripeness level.
          </div>
        ) : (
          <div className="grid gap-3">
            {recipes.map((recipe, i) => (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="p-4 rounded-xl bg-card border border-border space-y-3"
              >
                {recipe.imageUrl && (
                  <img
                    src={recipe.imageUrl}
                    alt={recipe.title}
                    className="w-full h-36 object-cover rounded-lg"
                  />
                )}
                <h5 className="font-semibold">{recipe.title}</h5>
                <p className="text-xs text-primary font-medium">{recipe.reason}</p>
                {(recipe.readyInMinutes || recipe.servings) && (
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {recipe.readyInMinutes && (
                      <span className="rounded-full bg-muted px-2 py-1">
                        {recipe.readyInMinutes} min
                      </span>
                    )}
                    {recipe.servings && (
                      <span className="rounded-full bg-muted px-2 py-1">
                        Serves {recipe.servings}
                      </span>
                    )}
                  </div>
                )}
                {recipe.nutrition && (
                  <div className="grid grid-cols-5 gap-2 rounded-lg bg-muted/50 p-3 text-center">
                    <div>
                      <div className="text-xs text-muted-foreground">Cal</div>
                      <div className="text-sm font-semibold">{recipe.nutrition.calories}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Protein</div>
                      <div className="text-sm font-semibold">{recipe.nutrition.protein}g</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Carbs</div>
                      <div className="text-sm font-semibold">{recipe.nutrition.carbs}g</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Fat</div>
                      <div className="text-sm font-semibold">{recipe.nutrition.fat}g</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Fiber</div>
                      <div className="text-sm font-semibold">{recipe.nutrition.fiber}g</div>
                    </div>
                  </div>
                )}
                {recipe.summary && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {recipe.summary.replace(/<[^>]*>/g, '')}
                  </p>
                )}
                {recipe.sourceUrl && (
                  <a
                    href={recipe.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {recipe.sourceName ?? 'View recipe'}
                  </a>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <Button onClick={onReset} variant="outline" className="w-full mt-2">
        Scan Another Item
      </Button>

      {analysis.status === 'ok' && (
        <RecipeAssistant
          analysis={analysis}
          onApplyRecipes={(assistantRecipes) => {
            setRecipes(assistantRecipes);
            setRecipeError(null);
          }}
        />
      )}
    </div>
  );
}
