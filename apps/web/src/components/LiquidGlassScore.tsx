import { motion } from 'framer-motion';

interface LiquidGlassScoreProps {
  score: number;
  label: string;
}

export function LiquidGlassScore({ score, label }: LiquidGlassScoreProps) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 120, damping: 14 }}
      className="relative flex flex-col items-center justify-center"
    >
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-full bg-white/20 blur-lg scale-110" />

      {/* Glass container */}
      <div
        className="relative flex flex-col items-center justify-center px-5 py-1.5 rounded-full overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.18) 100%)',
          backdropFilter: 'blur(24px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
          boxShadow: `
            0 0 0 1px rgba(255,255,255,0.5),
            inset 0 1px 2px rgba(255,255,255,0.6),
            inset 0 -1px 2px rgba(0,0,0,0.05),
            0 8px 32px rgba(0,0,0,0.12),
            0 2px 8px rgba(0,0,0,0.08)
          `,
        }}
      >
        <motion.span
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative text-xl font-bold font-sans text-foreground drop-shadow-sm leading-none"
        >
          {score}
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="relative text-xs font-medium font-sans text-foreground/70"
        >
          {label}
        </motion.span>
      </div>
    </motion.div>
  );
}

