import { motion } from 'framer-motion';
import { Leaf, Mail, Users, Scan, ChefHat, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 py-20 md:py-32">
        <div className="absolute inset-0 -z-10" style={{ background: 'var(--gradient-hero)', opacity: 0.08 }} />
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium"
          >
            <Leaf className="w-4 h-4" />
            AI-Powered Freshness Detection
          </motion.div>

          <motion.h1
            custom={1}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="text-5xl md:text-7xl font-bold tracking-tight"
          >
            FreshLens
          </motion.h1>

          <motion.p
            custom={2}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto"
          >
            Snap a photo of any fruit. Our AI analyzes ripeness in seconds and suggests perfect recipes matched to its stage — from fresh snacking to ripe-banana bread.
          </motion.p>

          <motion.div custom={3} initial="hidden" animate="visible" variants={fadeUp}>
            <Button
              size="lg"
              onClick={() => navigate('/scan')}
              className="gap-2 text-lg h-14 px-8 rounded-full"
            >
              Start Scanning <ArrowRight className="w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <motion.h2
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-center mb-12"
          >
            How It Works
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Scan, title: 'Scan', desc: 'Point your camera at a fruit and capture a photo.' },
              { icon: Leaf, title: 'Analyze', desc: 'Google DeepMind AI evaluates ripeness from visual cues.' },
              { icon: ChefHat, title: 'Cook', desc: 'Get recipe suggestions with full nutrition info, matched to ripeness.' },
            ].map((step, i) => (
              <motion.div
                key={step.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-card border border-border text-center"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* About Us */}
      <section id="about" className="px-6 py-16 md:py-24">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="p-8 md:p-12 rounded-3xl bg-card border border-border space-y-6"
            style={{ boxShadow: 'var(--shadow-elevated)' }}
          >
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              <h2 className="text-3xl font-bold">About Us</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              FreshLens is built by a team passionate about reducing food waste through technology.
              We believe that understanding ripeness is the key to better cooking, smarter shopping,
              and less waste. Our AI-powered tool helps you make the most of every piece of produce — 
              whether it's perfectly fresh for a salad or beautifully ripe for banana bread.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Powered by Google DeepMind's vision AI and enriched with recipe data from Spoonacular,
              FreshLens bridges the gap between what's in your kitchen and what you can create.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Us */}
      <section id="contact" className="px-6 py-16 md:py-24">
        <div className="max-w-lg mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="p-8 rounded-3xl bg-card border border-border space-y-6"
            style={{ boxShadow: 'var(--shadow-elevated)' }}
          >
            <div className="flex items-center gap-3">
              <Mail className="w-6 h-6 text-primary" />
              <h2 className="text-3xl font-bold">Contact Us</h2>
            </div>
            <p className="text-muted-foreground text-sm">
              Have questions, feedback, or partnership ideas? We'd love to hear from you.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
              }}
              className="space-y-4"
            >
              <input
                type="text"
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <input
                type="email"
                placeholder="Email address"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <textarea
                rows={4}
                placeholder="Your message"
                className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
              <Button type="submit" className="w-full rounded-xl h-12">
                Send Message
              </Button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 text-center text-sm text-muted-foreground border-t border-border">
        <p>© {new Date().getFullYear()} FreshLens. Built with 🍌 and AI.</p>
      </footer>
    </div>
  );
};

export default Home;
