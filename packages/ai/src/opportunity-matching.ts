import type {
  Mobility,
  OpportunityCandidate,
  OpportunityRecommendation,
  OpportunityStudentProfile,
} from '@kaushalsetu/types';

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function gradeNumber(value: string): number | null {
  const match = value.match(/\d+/);
  if (!match) return null;
  const grade = Number(match[0]);
  return Number.isFinite(grade) ? grade : null;
}

function mobilityRank(value: Mobility): number {
  return value === 'LOCAL_ONLY' ? 0 : value === 'SOME_TRAVEL' ? 1 : 2;
}

function urgencyFits(
  urgency: OpportunityStudentProfile['incomeUrgency'],
  type: OpportunityCandidate['type'],
): boolean {
  if (urgency === 'HIGH')
    return ['JOB', 'APPRENTICESHIP', 'INTERNSHIP', 'GOVERNMENT_SCHEME'].includes(type);
  if (urgency === 'LOW') return ['SCHOLARSHIP', 'TRAINING', 'GOVERNMENT_SCHEME'].includes(type);
  return true;
}

function matchOne(
  student: OpportunityStudentProfile,
  opportunity: OpportunityCandidate,
): OpportunityRecommendation {
  const missing: string[] = [];
  const reasons: string[] = [];
  let score = 25;
  const grade = gradeNumber(student.gradeLevel);
  const eligibility = opportunity.eligibility;

  if (
    eligibility.minimumGrade !== undefined &&
    (grade === null || grade < eligibility.minimumGrade)
  ) {
    missing.push(`Requires class ${eligibility.minimumGrade} or above`);
  }
  if (
    eligibility.maximumGrade !== undefined &&
    (grade === null || grade > eligibility.maximumGrade)
  ) {
    missing.push(`Open through class ${eligibility.maximumGrade}`);
  }

  const districts = eligibility.districts ?? (opportunity.district ? [opportunity.district] : []);
  if (districts.length > 0) {
    if (
      !student.district ||
      !districts.some((district) => normalize(district) === normalize(student.district ?? ''))
    ) {
      missing.push(`Available in ${districts.join(', ')}`);
    } else {
      score += 18;
      reasons.push(`available in your district (${student.district})`);
    }
  }

  const states = eligibility.states ?? (opportunity.state ? [opportunity.state] : []);
  if (states.length > 0) {
    if (
      !student.state ||
      !states.some((state) => normalize(state) === normalize(student.state ?? ''))
    ) {
      missing.push(`Available in ${states.join(', ')}`);
    } else {
      score += districts.length > 0 ? 0 : 12;
      if (districts.length === 0) reasons.push(`available in your state (${student.state})`);
    }
  }

  const requiredBadges = [
    ...new Set([...opportunity.requiredBadgeSlugs, ...(eligibility.requiredBadgeSlugs ?? [])]),
  ];
  const missingBadges = requiredBadges.filter(
    (slug) => !student.verifiedBadgeSlugs.some((badge) => normalize(badge) === normalize(slug)),
  );
  for (const badge of missingBadges) missing.push(`Earn the ${badge.replaceAll('-', ' ')} badge`);
  if (requiredBadges.length > 0 && missingBadges.length === 0) {
    score += Math.min(20, requiredBadges.length * 10);
    reasons.push(
      `you have ${requiredBadges.length === 1 ? 'the required verified badge' : 'the required verified badges'}`,
    );
  }

  const languages = eligibility.languages ?? [];
  if (languages.length > 0) {
    const languageMatches = languages.some(
      (language) => normalize(language) === normalize(student.preferredLanguage),
    );
    if (!languageMatches) missing.push(`Available languages: ${languages.join(', ')}`);
    else {
      score += 8;
      reasons.push('available in your preferred language');
    }
  }

  const minimumReadiness = eligibility.minimumReadiness;
  if (minimumReadiness !== undefined && student.readinessScore < minimumReadiness) {
    missing.push(`Readiness score ${minimumReadiness} needed`);
  } else if (student.readinessScore >= 40) {
    score += 8;
    reasons.push('your verified mission work shows readiness');
  }

  const requiredMobility = eligibility.mobility;
  if (requiredMobility && mobilityRank(student.mobility) < mobilityRank(requiredMobility)) {
    missing.push(`Requires ${requiredMobility.toLowerCase().replaceAll('_', ' ')}`);
  } else {
    score += 8;
    if (student.mobility === 'LOCAL_ONLY') reasons.push('fits your local travel needs');
  }

  const requiredPathways = [
    ...opportunity.pathwaySlugs,
    ...(eligibility.requiredPathwaySlugs ?? []),
  ];
  if (requiredPathways.length > 0) {
    const pathwayMatch = requiredPathways.some((slug) =>
      student.selectedPathwaySlugs.some((selected) => normalize(selected) === normalize(slug)),
    );
    if (!pathwayMatch) missing.push(`Choose a related pathway (${requiredPathways.join(', ')})`);
    else {
      score += 20;
      reasons.push('aligned with your selected pathway');
    }
  } else if (student.selectedPathwaySlugs.length > 0) {
    score += 10;
    reasons.push('fits a pathway you have selected');
  }

  if (
    eligibility.incomeUrgency?.length &&
    !eligibility.incomeUrgency.includes(student.incomeUrgency)
  ) {
    score -= 8;
  } else if (urgencyFits(student.incomeUrgency, opportunity.type)) {
    score += 8;
    if (student.incomeUrgency === 'HIGH') reasons.push('supports your goal to earn soon');
  }

  if (grade !== null && missing.length === 0) reasons.push('fits your current study level');
  if (reasons.length === 0 && missing.length === 0)
    reasons.push('a possible next step based on your profile');

  return {
    ...opportunity,
    score: missing.length > 0 ? 0 : Math.max(0, Math.min(100, score)),
    eligible: missing.length === 0,
    reasons: [...new Set(reasons)],
    missingRequirements: [...new Set(missing)],
  };
}

export function matchOpportunities(
  student: OpportunityStudentProfile,
  opportunities: OpportunityCandidate[],
): OpportunityRecommendation[] {
  return opportunities
    .map((opportunity) => matchOne(student, opportunity))
    .sort(
      (left, right) =>
        Number(right.eligible) - Number(left.eligible) ||
        right.score - left.score ||
        left.slug.localeCompare(right.slug),
    );
}
