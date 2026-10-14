export const pathwayTypes = ['QUICK_EARNING', 'VOCATIONAL_GROWTH', 'LONG_TERM_ACADEMIC'] as const;

export type PathwayType = (typeof pathwayTypes)[number];

export type Mobility = 'LOCAL_ONLY' | 'SOME_TRAVEL' | 'CAN_RELOCATE';
export type DeviceAccess = 'PERSONAL' | 'SHARED' | 'LIMITED';
export type IncomeUrgency = 'HIGH' | 'MEDIUM' | 'LOW';
export type FutureGoal = 'EARN_SOON' | 'PRACTICAL_SKILLS' | 'HIGHER_STUDIES' | 'BALANCED';

export interface OnboardingAnswers {
  gradeLevel: string;
  preferredLanguage: string;
  district?: string;
  state?: string;
  interests: string[];
  strengths: string[];
  dailyAvailableMinutes: number;
  mobility: Mobility;
  deviceAccess: DeviceAccess;
  incomeUrgency: IncomeUrgency;
  futureGoal: FutureGoal;
}

export interface PathwayCandidate {
  id: string;
  slug: string;
  title: string;
  category: string;
  pathwayType: PathwayType;
  description: string;
  durationWeeks: number;
  estimatedMonthlyEarningsMin: number;
  estimatedMonthlyEarningsMax: number;
  requiredSkills: string[];
  mobilityRequired: Mobility;
}

export interface PathwayLearningStep {
  title: string;
  description: string;
  sourceName: string;
  sourceUrl: string;
}

export interface PathwayExamOption {
  name: string;
  url: string;
  relevance: string;
}

export interface PathwayLearningGuidance {
  learningSteps: PathwayLearningStep[];
  examOptions: PathwayExamOption[];
  guidanceNote: string;
}

export interface LearningModuleCard {
  id: string;
  title: string;
  description: string;
  category: string;
  language: string;
  lessons: string[];
  pricingModel: 'FREE' | 'ONE_TIME' | 'SUBSCRIPTION';
  priceInr: number;
  status: 'DRAFT' | 'PUBLISHED';
  createdAt: string;
  updatedAt: string;
}

export interface PathwayRecommendation extends PathwayCandidate {
  score: number;
  rank: number;
  rationale: string;
}

export const opportunityTypes = [
  'SCHOLARSHIP',
  'GOVERNMENT_SCHEME',
  'TRAINING',
  'INTERNSHIP',
  'APPRENTICESHIP',
  'JOB',
] as const;

export type OpportunityType = (typeof opportunityTypes)[number];

export interface OpportunityEligibility {
  minimumGrade?: number;
  maximumGrade?: number;
  districts?: string[];
  states?: string[];
  languages?: string[];
  minimumReadiness?: number;
  requiredBadgeSlugs?: string[];
  requiredPathwaySlugs?: string[];
  mobility?: Mobility;
  incomeUrgency?: IncomeUrgency[];
}

export interface OpportunityStudentProfile {
  gradeLevel: string;
  district: string | null;
  state: string | null;
  preferredLanguage: string;
  mobility: Mobility;
  incomeUrgency: IncomeUrgency;
  readinessScore: number;
  selectedPathwaySlugs: string[];
  verifiedBadgeSlugs: string[];
}

export interface OpportunityCandidate {
  id: string;
  slug: string;
  title: string;
  type: OpportunityType;
  provider: string;
  description: string;
  district: string | null;
  state: string | null;
  applyBy: string | null;
  stipendMin: number | null;
  stipendMax: number | null;
  requiredDocuments: string[];
  eligibility: OpportunityEligibility;
  pathwaySlugs: string[];
  requiredBadgeSlugs: string[];
  isDemo: boolean;
}

export interface OpportunityRecommendation extends OpportunityCandidate {
  score: number;
  eligible: boolean;
  reasons: string[];
  missingRequirements: string[];
}

export interface InitiativeSource {
  id: string;
  name: string;
  category: string;
  overview: string;
  officialUrl: string;
  useFor: string;
  dataStatus: 'REFERENCE_ONLY';
}

export interface LearningAdvice {
  mode: 'LLM' | 'RULES_BASED';
  summary: string;
  nextSteps: { text: string; sources: { name: string; url: string }[] }[];
  note: string;
}
