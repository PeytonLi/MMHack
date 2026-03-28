import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ChefHat, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FreshnessAnalysis, BackendRecipe } from '@/types/freshness';
import { getFreshnessLabel, getFreshnessColor, getFreshnessTextColor, SKU_DATA, getRipenessDescription } from '@/lib/freshness';
import { getRecipeRecommendations } from '@/lib/api';

interface ResultScreenProps {
  analysis: FreshnessAnalysis;
  image: string;
  onReset: () => void;
}

export function ResultScreen({ analysis, image, onReset }: ResultScreenProps) {
  const skuInfo = SKU_DATA[analysis.sku];
  const label = getFreshnessLabel(analysis.score);
  const barColor = getFreshnessColor(analysis.score);
  const textColor = getFreshnessTextColor(analysis.score);
  const ripenessDesc = getRipenessDescription(analysis.sku, analysis.score);

  const [recipes, setRecipes] = useState<BackendRecipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [recipeError, setRecipeError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingRecipes(true);
    setRecipeError(null);
    getRecipeRecommendations(analysis.sku, image)
      .then((resp) => setRecipes(resp.recipes))
      .catch((err) => setRecipeError(err instanceof Error ? err.message : 'Failed to load recipes'))
      .finally(() => setLoadingRecipes(false));
  // image is stable for the lifetime of this result — no need to re-run on image changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis.sku]);

  return (
    <div className="flex flex-col gap-6 px-6 py-8 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onReset}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-bold">Analysis Result</h2>
      </div>

      {/* Image + Score Hero */}
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
            <div className="text-right">
              <div className={`text-5xl font-bold font-serif ${textColor}`}>{analysis.score}</div>
              <div className="text-primary-foreground/80 text-sm font-medium">{label}</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Freshness Bar */}
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

      {/* Rationale */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-4 rounded-xl bg-card border border-border space-y-2"
      >
        <h4 className="font-semibold text-sm">AI Assessment</h4>
        <p className="text-sm text-muted-foreground">{analysis.rationale}</p>
        <p className="text-sm text-primary font-medium">{ripenessDesc}</p>
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

      {/* Recipe Suggestions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-primary" />
          <h4 className="font-bold text-lg">Recipe Ideas</h4>
        </div>
        <p className="text-sm text-muted-foreground -mt-1">
          AI-selected recipes matched to this ripeness level:
        </p>

        {loadingRecipes ? (
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

                {/* AI-generated reason for this ripeness fit */}
                <p className="text-xs text-primary font-medium">{recipe.reason}</p>

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
    </div>
  );
}
