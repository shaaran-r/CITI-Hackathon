import type {
  FutureGoal,
  OnboardingAnswers,
  PathwayCandidate,
  PathwayRecommendation,
  PathwayType,
} from '@kaushalsetu/types';

const goalTrack: Record<FutureGoal, PathwayType | 'BALANCED'> = {
  EARN_SOON: 'QUICK_EARNING',
  PRACTICAL_SKILLS: 'VOCATIONAL_GROWTH',
  HIGHER_STUDIES: 'LONG_TERM_ACADEMIC',
  BALANCED: 'BALANCED',
};

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function calculateScore(
  answers: OnboardingAnswers,
  pathway: PathwayCandidate,
): { score: number; rationale: string } {
  const interests = new Set(answers.interests.map(normalized));
  const strengths = new Set(answers.strengths.map(normalized));
  const category = normalized(pathway.category);
  let score = 50;
  const reasons: string[] = [];

  if (interests.has(category)) {
    score += 20;
    reasons.push(`matches your interest in ${pathway.category}`);
  }

  const matchedSkills = pathway.requiredSkills.filter((skill) => strengths.has(normalized(skill)));
  if (matchedSkills.length > 0) {
    score += Math.min(matchedSkills.length * 8, 16);
    reasons.push(`builds on your ${matchedSkills.slice(0, 2).join(' and ')} strengths`);
  }

  const preferredTrack = goalTrack[answers.futureGoal];
  if (preferredTrack === pathway.pathwayType) {
    score += 14;
    reasons.push('fits the kind of next step you chose');
  }

  if (answers.incomeUrgency === 'HIGH') {
    score += pathway.pathwayType === 'QUICK_EARNING' ? 18 : -8;
    if (pathway.pathwayType === 'QUICK_EARNING') reasons.push('offers a quicker route to earning');
  } else if (answers.incomeUrgency === 'LOW' && pathway.pathwayType === 'LONG_TERM_ACADEMIC') {
    score += 8;
  }

  if (answers.mobility === 'LOCAL_ONLY') {
    score += pathway.mobilityRequired === 'LOCAL_ONLY' ? 8 : -18;
    if (pathway.mobilityRequired === 'LOCAL_ONLY') reasons.push('can be started close to home');
  } else if (answers.mobility === 'CAN_RELOCATE') {
    score += 4;
  }

  if (answers.dailyAvailableMinutes < 45 && pathway.durationWeeks <= 12) score += 5;
  if (answers.deviceAccess === 'LIMITED' && category === 'technology') score -= 8;

  const rationale =
    reasons.length > 0
      ? `Recommended because it ${reasons.join('; ')}.`
      : 'A practical option that keeps another future path open.';

  return { score: Math.max(0, Math.min(100, score)), rationale };
}

export function recommendPathways(
  answers: OnboardingAnswers,
  catalog: PathwayCandidate[],
): PathwayRecommendation[] {
  return (['QUICK_EARNING', 'VOCATIONAL_GROWTH', 'LONG_TERM_ACADEMIC'] as const).map(
    (pathwayType, index) => {
      const candidates = catalog.filter((pathway) => pathway.pathwayType === pathwayType);
      if (candidates.length === 0) {
        throw new Error(`No published pathway found for ${pathwayType}`);
      }

      const ranked = candidates
        .map((pathway) => ({ pathway, ...calculateScore(answers, pathway) }))
        .sort(
          (left, right) =>
            right.score - left.score || left.pathway.slug.localeCompare(right.pathway.slug),
        );
      const best = ranked[0];

      if (!best) throw new Error(`Unable to rank pathways for ${pathwayType}`);

      return { ...best.pathway, score: best.score, rationale: best.rationale, rank: index + 1 };
    },
  );
}
