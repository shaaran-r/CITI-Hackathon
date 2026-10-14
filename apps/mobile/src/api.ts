import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type {
  InitiativeSource,
  LearningModuleCard,
  LearningAdvice,
  OnboardingAnswers,
  PathwayLearningGuidance,
} from '@kaushalsetu/types';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:3001' : 'http://localhost:3001');

export interface PathwayCard {
  id: string;
  title: string;
  category: string;
  pathwayType: string;
  description: string;
  learningSteps: PathwayLearningGuidance['learningSteps'];
  examOptions: PathwayLearningGuidance['examOptions'];
  guidanceNote: string;
  durationWeeks: number;
  estimatedMonthlyEarningsMin: number;
  estimatedMonthlyEarningsMax: number;
  score: number;
  rank: number;
  rationale: string;
  status: string;
  isDemo: boolean;
}

export interface MissionAssignmentCard {
  id: string;
  status: string;
  assignedAt: string;
  dueAt: string | null;
  mission: {
    id: string;
    slug: string;
    title: string;
    description: string;
    skills: string[];
    estimatedMinutes: number;
    evidenceTypes: string[];
    isDemo: boolean;
  };
  latestSubmission: {
    id: string;
    version: number;
    clientSubmissionId: string | null;
    evidenceType: string;
    evidenceNote: string;
    status: string;
    submittedAt: string;
    reviewNote: string | null;
    reviewedAt: string | null;
  } | null;
}

export interface WalletSummary {
  student: { id: string; displayName: string; gradeLevel: string | null };
  readinessScore: number;
  verifiedSkills: string[];
  badges: {
    id: string;
    slug: string;
    title: string;
    description: string;
    skill: string;
    awardedAt: string;
    verified: boolean;
  }[];
  missionSummary: {
    total: number;
    approved: number;
    awaitingReview: number;
    facilitatorValidations: number;
  };
  pathwayProgress: {
    title: string;
    pathwayType: string;
    status: string;
    progressPercent: number | null;
    trackingAvailable: boolean;
  } | null;
  recentComments: {
    submissionId: string;
    status: string;
    note: string;
    reviewedAt: string | null;
  }[];
}

export interface OpportunityCard {
  id: string;
  slug: string;
  title: string;
  type: string;
  provider: string;
  description: string;
  district: string | null;
  state: string | null;
  applyBy: string | null;
  stipendMin: number | null;
  stipendMax: number | null;
  requiredDocuments: string[];
  isDemo: boolean;
  eligible: boolean;
  score: number;
  reasons: string[];
  missingRequirements: string[];
  savedAt: string | null;
  applicationId: string | null;
  applicationStatus: string | null;
}

export interface OpportunityApplicationCard {
  id: string;
  opportunityId: string;
  status: string;
  notes: string | null;
  documentsChecklist: string[];
  helpRequestedAt: string | null;
  helpRequestNote: string | null;
  facilitatorNote: string | null;
  submittedAt: string | null;
  updatedAt: string;
  opportunity: Pick<OpportunityCard, 'id' | 'title' | 'type' | 'applyBy' | 'isDemo'>;
}

export interface ParentChild {
  id: string;
  displayName: string;
  gradeLevel: string | null;
  preferredLanguage: string;
  relation: string;
}

export interface ParentTrustSummary {
  parent: { id: string; fullName: string };
  student: {
    id: string;
    displayName: string;
    gradeLevel: string | null;
    preferredLanguage: string;
    district: string | null;
    state: string | null;
    interests: string[];
    strengths: string[];
  };
  pathway: {
    title: string;
    description: string;
    status: string;
    isSelected: boolean;
    durationWeeks: number;
    estimatedMonthlyEarningsMin: number;
    estimatedMonthlyEarningsMax: number;
    costGuidance: string;
  } | null;
  wallet: {
    readinessScore: number;
    approvedMissionCount: number;
    totalMissionCount: number;
    badges: { title: string; skill: string; awardedAt: string; verified: boolean }[];
    approvedMissions: { title: string; approvedAt: string | null; skills: string[] }[];
  };
  opportunities: {
    id: string;
    title: string;
    type: string;
    provider: string;
    district: string | null;
    state: string | null;
    deadline: string | null;
    stipendMin: number | null;
    stipendMax: number | null;
    score: number;
    reasons: string[];
    facilitatorNote: string | null;
    isDemo: boolean;
  }[];
  applications: {
    id: string;
    title: string;
    type: string;
    status: string;
    submittedAt: string | null;
    facilitatorNote: string | null;
    isDemo: boolean;
  }[];
  facilitatorRecommendation: {
    opportunityTitle: string;
    note: string | null;
    recommendedAt: string;
    facilitator: string;
  } | null;
  facilitator: string | null;
  reassurance: string;
}

export interface DoorOpenerEvent {
  id: string;
  at: string;
  type: string;
  title: string;
  detail: string;
  actor: string;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  studentId?: string;
  parentId?: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  tokenOverride?: string,
): Promise<T> {
  const accessToken = tokenOverride ?? (await SecureStore.getItemAsync('accessToken'));
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok)
    throw new Error((await response.text()) || `Request failed (${response.status})`);
  return (await response.json()) as T;
}

export async function sendOtp(phone: string): Promise<{ accepted: true; devCode?: string }> {
  return request('/auth/send-otp', { method: 'POST', body: JSON.stringify({ phone }) });
}

export async function verifyOtp(phone: string, code: string): Promise<void> {
  const tokens = await request<TokenResponse>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  });
  if (!tokens.studentId) throw new Error('This account is not a student account.');
  await SecureStore.setItemAsync('accessToken', tokens.accessToken);
  await SecureStore.setItemAsync('refreshToken', tokens.refreshToken);
  await SecureStore.setItemAsync('studentId', tokens.studentId);
}

export async function verifyParentOtp(phone: string, code: string): Promise<void> {
  const tokens = await request<TokenResponse>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  });
  if (!tokens.parentId) throw new Error('This account is not a parent account.');
  await SecureStore.setItemAsync('parentAccessToken', tokens.accessToken);
  await SecureStore.setItemAsync('parentRefreshToken', tokens.refreshToken);
  await SecureStore.setItemAsync('parentId', tokens.parentId);
}

export async function completeProfile(answers: OnboardingAnswers): Promise<{
  studentId: string;
  recommendations: PathwayCard[];
}> {
  return request('/profiling/complete', { method: 'POST', body: JSON.stringify(answers) });
}

export async function getRecommendations(studentId: string): Promise<PathwayCard[]> {
  return request(`/pathways/recommended/${studentId}`);
}

export async function selectPathway(pathwayId: string): Promise<void> {
  await request('/student-pathways/select', {
    method: 'POST',
    body: JSON.stringify({ pathwayId }),
  });
}

export async function getStudentProfile(): Promise<{
  profile: { completedAt: string | null } | null;
}> {
  return request('/students/me');
}

export async function getAssignedMissions(studentId: string): Promise<MissionAssignmentCard[]> {
  return request(`/missions/assigned/${studentId}`);
}

export async function submitMissionEvidence(input: {
  assignmentId: string;
  clientSubmissionId: string;
  evidenceType: 'NOTE' | 'CHECKLIST';
  evidenceNote: string;
}): Promise<{ id: string; clientSubmissionId: string; status: string; submittedAt: string }> {
  return request('/missions/submissions', { method: 'POST', body: JSON.stringify(input) });
}

export async function getWallet(studentId: string): Promise<WalletSummary> {
  return request(`/wallet/${studentId}`);
}

export async function getMatchedOpportunities(studentId: string): Promise<OpportunityCard[]> {
  return request(`/opportunities/matched/${studentId}`);
}

export async function getInitiativeSources(): Promise<InitiativeSource[]> {
  return request('/sources');
}

export async function getLearningModules(): Promise<LearningModuleCard[]> {
  return request('/learning/modules');
}

export async function getLearningAdvice(studentId: string): Promise<LearningAdvice> {
  return request(`/learning/advice/${studentId}`);
}

export async function getOpportunity(opportunityId: string): Promise<OpportunityCard> {
  return request(`/opportunities/${opportunityId}`);
}

export async function setOpportunitySaved(opportunityId: string, saved: boolean): Promise<void> {
  await request('/opportunities/bookmark', {
    method: 'POST',
    body: JSON.stringify({ opportunityId, saved }),
  });
}

export async function startOpportunityApplication(
  opportunityId: string,
): Promise<OpportunityApplicationCard> {
  return request('/applications', {
    method: 'POST',
    body: JSON.stringify({ opportunityId }),
  });
}

export async function getApplications(studentId: string): Promise<OpportunityApplicationCard[]> {
  return request(`/applications/student/${studentId}`);
}

export async function updateApplicationStatus(
  applicationId: string,
  status: 'IN_PROGRESS' | 'SUBMITTED',
): Promise<OpportunityApplicationCard> {
  return request(`/applications/${applicationId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function requestApplicationHelp(applicationId: string, note: string): Promise<void> {
  await request(`/applications/${applicationId}/help`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export async function getParentChildren(parentToken: string): Promise<ParentChild[]> {
  return request('/parent/children', {}, parentToken);
}

export async function getParentSummary(
  parentToken: string,
  studentId: string,
): Promise<ParentTrustSummary> {
  return request(`/parent/children/${studentId}/summary`, {}, parentToken);
}

export async function getParentTimeline(
  parentToken: string,
  studentId: string,
): Promise<DoorOpenerEvent[]> {
  return request(`/parent/children/${studentId}/timeline`, {}, parentToken);
}
