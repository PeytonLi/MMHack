import { useEffect, useMemo, useState } from 'react';
import { Bot, Loader2, Send, Sparkles } from 'lucide-react';

import { sendRecipeAssistantMessage } from '@/lib/api';
import type { BackendRecipe, FreshnessMatchAnalysis, RecipeAssistantMessage } from '@/types/freshness';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

interface RecipeAssistantProps {
  analysis: FreshnessMatchAnalysis;
  onApplyRecipes: (recipes: BackendRecipe[]) => void;
}

const QUICK_PROMPTS = [
  'Make it high protein and under 30 minutes.',
  'Make it vegan.',
  'Avoid nuts.',
];

function getIntroMessage(analysis: FreshnessMatchAnalysis): RecipeAssistantMessage {
  return {
    role: 'assistant',
    content: `I can refine recipes for this ${analysis.ripenessBand.replace('_', ' ')} ${analysis.sku}. Ask for things like vegan, high protein, under 30 minutes, or ingredients to avoid.`,
  };
}

export function RecipeAssistant({ analysis, onApplyRecipes }: RecipeAssistantProps) {
  const introMessage = useMemo(() => getIntroMessage(analysis), [analysis]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<RecipeAssistantMessage[]>([introMessage]);
  const [appliedConstraints, setAppliedConstraints] = useState<string[]>([]);
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null);

  useEffect(() => {
    setOpen(false);
    setDraft('');
    setLoading(false);
    setMessages([introMessage]);
    setAppliedConstraints([]);
    setUnavailableMessage(null);
  }, [introMessage]);

  async function handleSendMessage(override?: string) {
    const message = (override ?? draft).trim();
    if (!message || loading) {
      return;
    }

    const nextMessages = [...messages, { role: 'user' as const, content: message }];
    setMessages(nextMessages);
    setDraft('');
    setLoading(true);
    setUnavailableMessage(null);

    try {
      const response = await sendRecipeAssistantMessage(analysis.sku, analysis, messages, message);

      if (response.status === 'assistant_unavailable') {
        setUnavailableMessage(response.message);
        return;
      }

      setMessages([...nextMessages, { role: 'assistant', content: response.reply }]);
      setAppliedConstraints(response.appliedConstraints);
      if (response.recipes.length > 0) {
        onApplyRecipes(response.recipes);
      }
    } catch (error) {
      setUnavailableMessage(error instanceof Error ? error.message : 'Recipe assistant failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          size="icon"
          className="fixed bottom-4 right-4 z-40 h-14 w-14 rounded-full shadow-lg"
          aria-label="Open recipe assistant"
        >
          <Sparkles className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex h-full w-full flex-col sm:max-w-md">
        <SheetHeader className="pr-8">
          <SheetTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Recipe Assistant
          </SheetTitle>
          <SheetDescription>
            Grounded recipe help for this {analysis.sku} scan. I will only suggest real recipe matches.
          </SheetDescription>
        </SheetHeader>

        {appliedConstraints.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {appliedConstraints.map((constraint) => (
              <Badge key={constraint} variant="secondary">
                {constraint}
              </Badge>
            ))}
          </div>
        )}

        <ScrollArea className="mt-4 flex-1 rounded-xl border border-border bg-card p-4">
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}-${message.content}`}
                className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                  message.role === 'assistant'
                    ? 'bg-muted text-foreground'
                    : 'ml-auto bg-primary text-primary-foreground'
                }`}
              >
                {message.content}
              </div>
            ))}
            {loading && (
              <div className="inline-flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking through grounded recipe options...
              </div>
            )}
            {unavailableMessage && (
              <div className="rounded-2xl border border-dashed border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-muted-foreground">
                {unavailableMessage}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <Button
                key={prompt}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleSendMessage(prompt)}
                disabled={loading}
                className="text-xs"
              >
                {prompt}
              </Button>
            ))}
          </div>
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask for a new recipe direction, ingredients to avoid, or time limits..."
            className="min-h-[100px]"
            disabled={loading}
          />
          <Button
            type="button"
            onClick={() => void handleSendMessage()}
            disabled={loading || draft.trim().length === 0}
            className="w-full gap-2"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Ask Assistant
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
