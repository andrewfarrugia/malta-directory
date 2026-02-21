export type ConsentCategory = "necessary" | "analytics" | "marketing";

export interface ConsentState {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

export const CONSENT_KEY = "msh_consent_v1";

export const defaultConsent: ConsentState = {
  necessary: true,
  analytics: false,
  marketing: false,
  updatedAt: ""
};

export const parseConsent = (value: string | null): ConsentState => {
  if (!value) {
    return defaultConsent;
  }

  try {
    const parsed = JSON.parse(value) as Partial<ConsentState>;
    return {
      necessary: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      updatedAt: parsed.updatedAt || ""
    };
  } catch {
    return defaultConsent;
  }
};
