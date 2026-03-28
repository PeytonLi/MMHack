import { pricingActionSchema, supportedSkuSchema, type PricingAction, type SupportedSku } from "@mmhack/shared";

export type VoriItemSnapshot = {
  currentPriceCents: number;
  sku: SupportedSku;
  voriItemId: string;
};

export type ApplyPricingUpdateInput = {
  action: PricingAction;
  currentPriceCents: number;
  voriItemId: string;
};

export type VoriUpdateResult = {
  message: string;
  success: boolean;
};

export class VoriClient {
  constructor(
    private readonly options: {
      apiBaseUrl?: string;
      apiKey?: string;
    },
  ) {}

  ensureConfigured(): void {
    if (!this.options.apiBaseUrl || !this.options.apiKey) {
      throw new Error("VORI_API_BASE_URL and VORI_API_KEY are required before live Vori calls can be implemented.");
    }
  }

  async getItemSnapshot(snapshot: VoriItemSnapshot): Promise<VoriItemSnapshot> {
    supportedSkuSchema.parse(snapshot.sku);
    return snapshot;
  }

  async applyPricingUpdate(input: ApplyPricingUpdateInput): Promise<VoriUpdateResult> {
    pricingActionSchema.parse(input.action);

    return {
      message: `Scaffolded Vori update for ${input.voriItemId} with action ${input.action.type}.`,
      success: false,
    };
  }
}
