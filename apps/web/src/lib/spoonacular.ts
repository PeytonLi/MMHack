import { SupportedSku } from '@/types/freshness';

/** @deprecated Use the backend API (/api/recipes) instead of calling Spoonacular directly. */
interface SpoonacularRecipe {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  summary: string;
  nutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    fiber: number;
  };
}

// Replace with your Spoonacular API key
const API_KEY = 'b303c73f32fa4c7998b97871af9f372f';
const BASE_URL = 'https://api.spoonacular.com';

function getRipenessQuery(sku: SupportedSku, score: number): string {
  if (score >= 7) {
    return `fresh ${sku}`;
  } else if (score >= 4) {
    const cooked: Record<SupportedSku, string> = {
      banana: 'ripe banana bread pancakes',
      apple: 'baked apple pie applesauce',
      tomato: 'tomato sauce soup roasted',
      avocado: 'ripe avocado guacamole spread',
      strawberry: 'strawberry jam compote baked',
      mango: 'ripe mango chutney smoothie',
      peach: 'baked peach cobbler grilled',
      pear: 'poached pear baked dessert',
      pineapple: 'grilled pineapple caramelized',
      lettuce: 'lettuce wraps salad fresh',
      bell_pepper: 'stuffed bell pepper roasted',
      broccoli: 'broccoli stir fry steamed',
    };
    return cooked[sku];
  } else {
    const overripe: Record<SupportedSku, string> = {
      banana: 'overripe banana muffins ice cream',
      apple: 'apple butter cider jam',
      tomato: 'tomato paste salsa concentrate',
      avocado: 'overripe avocado brownies mousse',
      strawberry: 'strawberry sauce syrup puree',
      mango: 'mango puree sorbet lassi',
      peach: 'peach preserves jam butter',
      pear: 'pear butter sauce compote',
      pineapple: 'pineapple upside down cake jam',
      lettuce: 'wilted lettuce soup braised',
      bell_pepper: 'roasted pepper sauce dip',
      broccoli: 'broccoli soup puree casserole',
    };
    return overripe[sku];
  }
}

export async function fetchRecipesForRipeness(
  sku: SupportedSku,
  score: number
): Promise<SpoonacularRecipe[]> {
  if (!API_KEY) {
    console.warn('Spoonacular API key not set — returning empty results');
    return [];
  }

  const query = getRipenessQuery(sku, score);

  try {
    const searchRes = await fetch(
      `${BASE_URL}/recipes/complexSearch?query=${encodeURIComponent(query)}&number=3&addRecipeNutrition=true&apiKey=${API_KEY}`
    );

    if (!searchRes.ok) {
      console.error('Spoonacular search failed:', searchRes.status);
      return [];
    }

    const data = await searchRes.json();

    return (data.results || []).map((r: any) => {
      const nutrients = r.nutrition?.nutrients || [];
      const get = (name: string) =>
        nutrients.find((n: any) => n.name === name)?.amount ?? 0;

      return {
        id: r.id,
        title: r.title,
        image: r.image,
        readyInMinutes: r.readyInMinutes,
        servings: r.servings,
        summary: r.summary?.replace(/<[^>]*>/g, '').slice(0, 200) || '',
        nutrition: {
          calories: Math.round(get('Calories')),
          protein: Math.round(get('Protein')),
          fat: Math.round(get('Fat')),
          carbs: Math.round(get('Carbohydrates')),
          fiber: Math.round(get('Fiber')),
        },
      } satisfies SpoonacularRecipe;
    });
  } catch (err) {
    console.error('Spoonacular fetch error:', err);
    return [];
  }
}
