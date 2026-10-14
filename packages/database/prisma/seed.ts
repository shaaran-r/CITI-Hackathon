import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const pathways = [
  {
    slug: 'local-farm-services',
    title: 'Local farm services',
    category: 'agriculture',
    pathwayType: 'QUICK_EARNING',
    durationWeeks: 8,
    min: 0,
    max: 0,
    skills: ['communication', 'observation'],
    mobility: 'LOCAL_ONLY',
  },
  {
    slug: 'community-digital-help',
    title: 'Community digital help',
    category: 'technology',
    pathwayType: 'QUICK_EARNING',
    durationWeeks: 10,
    min: 0,
    max: 0,
    skills: ['digital basics', 'communication'],
    mobility: 'LOCAL_ONLY',
  },
  {
    slug: 'home-food-enterprise',
    title: 'Home food enterprise',
    category: 'business',
    pathwayType: 'QUICK_EARNING',
    durationWeeks: 8,
    min: 0,
    max: 0,
    skills: ['planning', 'creativity'],
    mobility: 'LOCAL_ONLY',
  },
  {
    slug: 'solar-technician',
    title: 'Solar technician',
    category: 'technology',
    pathwayType: 'VOCATIONAL_GROWTH',
    durationWeeks: 24,
    min: 0,
    max: 0,
    skills: ['problem-solving', 'practical work'],
    mobility: 'SOME_TRAVEL',
  },
  {
    slug: 'health-community-worker',
    title: 'Community health support',
    category: 'health',
    pathwayType: 'VOCATIONAL_GROWTH',
    durationWeeks: 20,
    min: 0,
    max: 0,
    skills: ['care', 'communication'],
    mobility: 'LOCAL_ONLY',
  },
  {
    slug: 'repair-and-electrical',
    title: 'Repair and electrical skills',
    category: 'technology',
    pathwayType: 'VOCATIONAL_GROWTH',
    durationWeeks: 28,
    min: 0,
    max: 0,
    skills: ['problem-solving', 'practical work'],
    mobility: 'SOME_TRAVEL',
  },
  {
    slug: 'agriculture-science',
    title: 'Agriculture science',
    category: 'science',
    pathwayType: 'LONG_TERM_ACADEMIC',
    durationWeeks: 52,
    min: 0,
    max: 0,
    skills: ['observation', 'science'],
    mobility: 'SOME_TRAVEL',
  },
  {
    slug: 'commerce-and-technology',
    title: 'Commerce and technology studies',
    category: 'business',
    pathwayType: 'LONG_TERM_ACADEMIC',
    durationWeeks: 52,
    min: 0,
    max: 0,
    skills: ['planning', 'digital basics'],
    mobility: 'SOME_TRAVEL',
  },
  {
    slug: 'community-learning-helper',
    title: 'Community learning helper',
    category: 'education',
    pathwayType: 'QUICK_EARNING',
    durationWeeks: 8,
    min: 0,
    max: 0,
    skills: ['communication', 'care'],
    mobility: 'LOCAL_ONLY',
  },
  {
    slug: 'local-craft-enterprise',
    title: 'Local craft and repair enterprise',
    category: 'crafts',
    pathwayType: 'QUICK_EARNING',
    durationWeeks: 10,
    min: 0,
    max: 0,
    skills: ['practical work', 'planning'],
    mobility: 'LOCAL_ONLY',
  },
  {
    slug: 'community-water-steward',
    title: 'Community water and environment steward',
    category: 'environment',
    pathwayType: 'QUICK_EARNING',
    durationWeeks: 8,
    min: 0,
    max: 0,
    skills: ['observation', 'communication'],
    mobility: 'LOCAL_ONLY',
  },
  {
    slug: 'agri-equipment-maintenance',
    title: 'Agriculture equipment maintenance',
    category: 'agriculture',
    pathwayType: 'VOCATIONAL_GROWTH',
    durationWeeks: 24,
    min: 0,
    max: 0,
    skills: ['practical work', 'problem-solving'],
    mobility: 'SOME_TRAVEL',
  },
  {
    slug: 'food-processing-practice',
    title: 'Food processing and quality practice',
    category: 'food',
    pathwayType: 'VOCATIONAL_GROWTH',
    durationWeeks: 20,
    min: 0,
    max: 0,
    skills: ['observation', 'planning'],
    mobility: 'LOCAL_ONLY',
  },
  {
    slug: 'hospitality-and-local-culture',
    title: 'Hospitality and local culture',
    category: 'hospitality',
    pathwayType: 'VOCATIONAL_GROWTH',
    durationWeeks: 16,
    min: 0,
    max: 0,
    skills: ['communication', 'care'],
    mobility: 'SOME_TRAVEL',
  },
  {
    slug: 'teaching-and-learning-studies',
    title: 'Teaching and learning studies',
    category: 'education',
    pathwayType: 'LONG_TERM_ACADEMIC',
    durationWeeks: 52,
    min: 0,
    max: 0,
    skills: ['communication', 'planning'],
    mobility: 'SOME_TRAVEL',
  },
  {
    slug: 'environmental-science',
    title: 'Environmental science',
    category: 'environment',
    pathwayType: 'LONG_TERM_ACADEMIC',
    durationWeeks: 52,
    min: 0,
    max: 0,
    skills: ['observation', 'science'],
    mobility: 'SOME_TRAVEL',
  },
  {
    slug: 'design-and-visual-communication',
    title: 'Design and visual communication',
    category: 'design',
    pathwayType: 'LONG_TERM_ACADEMIC',
    durationWeeks: 52,
    min: 0,
    max: 0,
    skills: ['creativity', 'communication'],
    mobility: 'SOME_TRAVEL',
  },
  {
    slug: 'public-service-and-community-policy',
    title: 'Public service and community policy',
    category: 'public service',
    pathwayType: 'LONG_TERM_ACADEMIC',
    durationWeeks: 52,
    min: 0,
    max: 0,
    skills: ['communication', 'observation'],
    mobility: 'SOME_TRAVEL',
  },
].map(({ min, max, skills, mobility, ...pathway }) => ({
  ...pathway,
  description: `${pathway.title} is a demo learning direction. Check local training and support before making decisions.`,
  estimatedMonthlyEarningsMin: min,
  estimatedMonthlyEarningsMax: max,
  requiredSkills: JSON.stringify(skills),
  mobilityRequired: mobility,
  isDemo: true,
  isPublished: true,
}));

const missions = [
  'Map a nearby water point',
  'Interview a local grower',
  'Create a household budget',
  'Help a neighbor use a phone setting',
  'Observe and record local plants',
  'Plan a safe walking route',
  'Make a simple repair checklist',
  'Compare market prices',
  'Prepare a seed storage guide',
  'Record a local story with permission',
  'Organize a community clean-up plan',
  'Explain one health habit to a family member',
  'Design a paper sign for a local event',
  'Track household water use for a day',
  'Make a study timetable with a friend',
].map((title, index) => ({
  slug: `demo-mission-${index + 1}`,
  title: `[DEMO] ${title}`,
  description:
    'DEMO ONLY: A practice activity. Ask a trusted adult before taking photos or sharing information.',
  skills: JSON.stringify(['observation', 'communication']),
  estimatedMinutes: 20 + (index % 4) * 10,
  evidenceTypes: 'NOTE,CHECKLIST',
  isDemo: true,
  isPublished: true,
}));

const opportunityNames = [
  'Local digital skills workshop',
  'Community garden learning group',
  'School science club',
  'Basic electrical safety course',
  'Community health awareness training',
  'Student learning kit support',
  'Youth enterprise practice program',
  'Library computer orientation',
  'Water testing demonstration',
  'Local craft skills workshop',
  'Career conversation with a volunteer',
  'School travel support example',
  'Introductory solar workshop',
  'Community mapping activity',
  'Study group facilitator practice',
];

const opportunityTypes = [
  'TRAINING',
  'SCHOLARSHIP',
  'GOVERNMENT_SCHEME',
  'INTERNSHIP',
  'APPRENTICESHIP',
  'JOB',
];

const opportunities = opportunityNames.map((title, index) => {
  const district = index % 4 === 0 ? 'Mysuru' : null;
  const state = index % 3 === 0 ? 'Karnataka' : null;
  const requiredBadgeSlugs = index === 2 || index === 12 ? ['demo-community-observer'] : [];
  const pathwaySlugs = index === 0 ? ['community-digital-help'] : [];
  const type = opportunityTypes[index % opportunityTypes.length] ?? 'TRAINING';

  return {
    slug: `demo-opportunity-${index + 1}`,
    title: `[DEMO] ${title}`,
    type,
    provider: '[DEMO] Sample community provider',
    description:
      'DEMO ONLY. Fictional sample record, not a real scholarship, scheme, internship, or job. Verify every detail locally.',
    eligibility: JSON.stringify({
      minimumGrade: 9,
      maximumGrade: 12,
      ...(state ? { states: [state] } : {}),
      ...(district ? { districts: [district] } : {}),
      ...(index % 5 === 0 ? { languages: ['hi', 'en'] } : {}),
      ...(index === 8 ? { minimumReadiness: 35 } : {}),
      ...(index % 4 === 2 ? { mobility: 'SOME_TRAVEL' } : { mobility: 'LOCAL_ONLY' }),
      ...(index < 3 ? { incomeUrgency: ['HIGH', 'MEDIUM'] } : {}),
      demo: true,
    }),
    district,
    state,
    stipendMin: ['JOB', 'INTERNSHIP', 'APPRENTICESHIP'].includes(type) ? 1500 : null,
    stipendMax: ['JOB', 'INTERNSHIP', 'APPRENTICESHIP'].includes(type) ? 5000 : null,
    requiredBadgeSlugs: JSON.stringify(requiredBadgeSlugs),
    requiredDocuments: JSON.stringify(['school ID', 'guardian contact']),
    pathwaySlugs: JSON.stringify(pathwaySlugs),
    applyBy: new Date(Date.UTC(2027, 0, 1 + index * 3)),
    isDemo: true,
    isPublished: true,
  };
});

async function main(): Promise<void> {
  const facilitators = [];

  for (let index = 1; index <= 3; index += 1) {
    const phone = `+91910000000${index}`;
    const user = await prisma.user.upsert({
      where: { phone },
      update: { role: 'FACILITATOR', isActive: true },
      create: { phone, role: 'FACILITATOR', phoneVerifiedAt: new Date() },
    });
    facilitators.push(
      await prisma.facilitator.upsert({
        where: { userId: user.id },
        update: { fullName: `Demo Facilitator ${index}` },
        create: { userId: user.id, fullName: `Demo Facilitator ${index}` },
      }),
    );
  }

  for (let index = 1; index <= 10; index += 1) {
    const phone = `+91900000000${index}`;
    const user = await prisma.user.upsert({
      where: { phone },
      update: { role: 'STUDENT', isActive: true },
      create: { phone, role: 'STUDENT', phoneVerifiedAt: new Date() },
    });
    await prisma.student.upsert({
      where: { userId: user.id },
      update: { displayName: `Demo Student ${index}`, gradeLevel: `${8 + (index % 5)}` },
      create: {
        userId: user.id,
        displayName: `Demo Student ${index}`,
        gradeLevel: `${8 + (index % 5)}`,
        facilitatorId: facilitators[(index - 1) % facilitators.length]?.id,
      },
    });
  }

  for (const pathway of pathways) {
    const { slug, ...data } = pathway;
    await prisma.pathway.upsert({ where: { slug }, update: data, create: { slug, ...data } });
  }

  for (const mission of missions) {
    const { slug, ...data } = mission;
    await prisma.mission.upsert({ where: { slug }, update: data, create: { slug, ...data } });
  }

  for (const opportunity of opportunities) {
    const { slug, ...data } = opportunity;
    await prisma.opportunity.upsert({ where: { slug }, update: data, create: { slug, ...data } });
  }

  const badge = await prisma.skillBadge.upsert({
    where: { slug: 'demo-community-observer' },
    update: { title: '[DEMO] Community observer' },
    create: {
      slug: 'demo-community-observer',
      title: '[DEMO] Community observer',
      description: 'Demo badge for practicing careful observation.',
      skill: 'observation',
      isDemo: true,
    },
  });
  const firstStudent = await prisma.student.findFirst({ orderBy: { createdAt: 'asc' } });
  const parentUser = await prisma.user.upsert({
    where: { phone: '+919200000001' },
    update: { role: 'PARENT', isActive: true },
    create: { phone: '+919200000001', role: 'PARENT', phoneVerifiedAt: new Date() },
  });
  const parent = await prisma.parent.upsert({
    where: { userId: parentUser.id },
    update: { fullName: 'Demo Family Member' },
    create: { userId: parentUser.id, fullName: 'Demo Family Member' },
  });
  if (firstStudent) {
    await prisma.parentStudent.upsert({
      where: { parentId_studentId: { parentId: parent.id, studentId: firstStudent.id } },
      update: {},
      create: { parentId: parent.id, studentId: firstStudent.id },
    });
    await prisma.studentBadge.upsert({
      where: { studentId_badgeId: { studentId: firstStudent.id, badgeId: badge.id } },
      update: {},
      create: { studentId: firstStudent.id, badgeId: badge.id },
    });
    for (const slug of ['demo-mission-1', 'demo-mission-2', 'demo-mission-3']) {
      const mission = await prisma.mission.findUnique({ where: { slug } });
      if (!mission) continue;
      await prisma.missionAssignment.upsert({
        where: { studentId_missionId: { studentId: firstStudent.id, missionId: mission.id } },
        update: {},
        create: { studentId: firstStudent.id, missionId: mission.id },
      });
    }
  }

  console.info(
    'Seeded demo data: 10 students, 3 facilitators, 18 pathways, 15 missions, 15 opportunities.',
  );
  console.info('Student login: +919000000001; development OTP: 123456.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
