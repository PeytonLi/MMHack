import { motion } from 'framer-motion';
import { SKU_DATA } from '@/lib/freshness';
import { SupportedSku } from '@/types/freshness';

interface AnalyzingScreenProps {
  sku: SupportedSku;
  image: string;
}

export function AnalyzingScreen({ sku, image }: AnalyzingScreenProps) {
  const skuInfo = SKU_DATA[sku];

  return (
    <div className="flex flex-col items-center gap-8 px-6 py-12">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center space-y-2"
      >
        <h2 className="text-2xl font-bold">Analyzing {skuInfo.label}</h2>
        <p className="text-muted-foreground">Google DeepMind is assessing freshness…</p>
      </motion.div>

      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="w-16 h-16 rounded-full border-4 border-muted border-t-primary"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xs aspect-square rounded-2xl overflow-hidden"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <img src={image} alt={`${skuInfo.label} being analyzed`} className="w-full h-full object-cover" />
      </motion.div>

      <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          🔍 Inspecting surface quality…
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          🎨 Evaluating color patterns…
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.5 }}
        >
          📊 Computing freshness score…
        </motion.span>
      </div>
    </div>
  );
}
