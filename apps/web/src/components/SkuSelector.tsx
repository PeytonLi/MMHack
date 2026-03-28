import { motion } from 'framer-motion';
import { SKU_DATA } from '@/lib/freshness';
import { SupportedSku } from '@/types/freshness';

interface SkuSelectorProps {
  onSelect: (sku: SupportedSku) => void;
}

export function SkuSelector({ onSelect }: SkuSelectorProps) {
  const skus = Object.values(SKU_DATA);

  return (
    <div className="flex flex-col items-center gap-8 px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <h1 className="text-4xl font-bold tracking-tight">
          FreshLens
        </h1>
        <p className="text-muted-foreground text-lg max-w-sm">
          Scan produce to assess freshness, get pricing guidance, and discover recipes
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg">
        {skus.map((item, i) => (
          <motion.button
            key={item.sku}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.1 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(item.sku)}
            className="flex flex-col items-center gap-3 p-8 rounded-2xl bg-card border border-border hover:border-primary/40 transition-colors"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            <span className="text-6xl">{item.emoji}</span>
            <span className="font-semibold text-lg">{item.label}</span>
            <span className="text-sm text-muted-foreground">{item.description}</span>
          </motion.button>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-sm text-muted-foreground mt-4"
      >
        Select a produce item to begin scanning
      </motion.p>
    </div>
  );
}
