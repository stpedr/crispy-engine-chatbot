import type { CustomerProfile, LeadStage, Product } from "./types";

export function scoreLead(profile: CustomerProfile): number {
  let score = 0;

  if (profile.name) score += 10;
  if (profile.email) score += 20;
  if (profile.company) score += 10;
  if (profile.pain) score += 20;
  if (profile.budget && profile.budget > 0) score += 15;

  if (profile.timeline === "now") score += 15;
  if (profile.timeline === "this_month") score += 12;
  if (profile.timeline === "this_quarter") score += 8;
  if (profile.consentToContact) score += 10;

  return Math.min(score, 100);
}

export function decideLeadStage(input: {
  score: number;
  profile: CustomerProfile;
  recommendedProducts: Product[];
}): LeadStage {
  const { score, profile, recommendedProducts } = input;

  if (score >= 80 && profile.email && profile.consentToContact) return "handoff";
  if (score >= 70 && recommendedProducts.length > 0) return "proposal";
  if (score >= 60) return "qualified";
  if (score > 0) return "qualifying";
  return "new";
}

export function missingQualificationFields(profile: CustomerProfile): Array<keyof CustomerProfile> {
  const missing: Array<keyof CustomerProfile> = [];

  if (!profile.pain) missing.push("pain");
  if (!profile.email) missing.push("email");
  if (!profile.budget) missing.push("budget");
  if (!profile.timeline) missing.push("timeline");

  return missing;
}
