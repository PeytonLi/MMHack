import { useState, useCallback } from 'react';
import { SkuSelector } from '@/components/SkuSelector';
import { CameraCapture } from '@/components/CameraCapture';
import { AnalyzingScreen } from '@/components/AnalyzingScreen';
import { ResultScreen } from '@/components/ResultScreen';
import { AppStep, FreshnessAnalysis, SupportedSku } from '@/types/freshness';
import { analyzeRipeness } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [step, setStep] = useState<AppStep>('select');
  const [selectedSku, setSelectedSku] = useState<SupportedSku | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FreshnessAnalysis | null>(null);
  const { toast } = useToast();

  const handleSkuSelect = useCallback((sku: SupportedSku) => {
    setSelectedSku(sku);
    setStep('capture');
  }, []);

  const handleCapture = useCallback(async (imageDataUrl: string) => {
    if (!selectedSku) return;
    setCapturedImage(imageDataUrl);
    setStep('analyzing');
    try {
      const result = await analyzeRipeness(selectedSku, imageDataUrl);
      setAnalysis(result);
      setStep('result');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not reach the backend. Is the API server running?';
      const isQuotaError = message.includes('Gemini is out of requests right now');
      toast({
        title: isQuotaError ? 'Gemini quota reached' : 'Analysis failed',
        description: message,
        variant: 'destructive',
      });
      setStep('capture');
    }
  }, [selectedSku, toast]);

  const handleReset = useCallback(() => {
    setStep('select');
    setSelectedSku(null);
    setCapturedImage(null);
    setAnalysis(null);
  }, []);

  const handleBack = useCallback(() => {
    setStep('select');
    setSelectedSku(null);
  }, []);

  return (
    <div className="min-h-screen">
      {step === 'select' && <SkuSelector onSelect={handleSkuSelect} />}
      {step === 'capture' && selectedSku && (
        <CameraCapture sku={selectedSku} onCapture={handleCapture} onBack={handleBack} />
      )}
      {step === 'analyzing' && selectedSku && capturedImage && (
        <AnalyzingScreen sku={selectedSku} image={capturedImage} />
      )}
      {step === 'result' && analysis && capturedImage && (
        <ResultScreen analysis={analysis} image={capturedImage} onReset={handleReset} />
      )}
    </div>
  );
};

export default Index;
