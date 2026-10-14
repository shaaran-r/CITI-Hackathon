import type { PathwayLearningGuidance } from '@kaushalsetu/types';

const guidanceBySlug: Record<string, PathwayLearningGuidance> = {
  'local-farm-services': {
    learningSteps: [
      {
        title: 'Build observation and basic science',
        description:
          'Use grade-appropriate science resources to understand soil, water, and plants.',
        sourceName: 'DIKSHA',
        sourceUrl: 'https://diksha.gov.in/',
      },
      {
        title: 'Explore local agriculture skills',
        description: 'Search for agriculture courses and nearby training before paying any fee.',
        sourceName: 'Skill India Digital Hub',
        sourceUrl: 'https://www.skillindiadigital.gov.in/',
      },
    ],
    examOptions: [],
    guidanceNote: 'This practical pathway does not require a national entrance exam.',
  },
  'community-digital-help': {
    learningSteps: [
      {
        title: 'Practice safe digital basics',
        description: 'Strengthen reading, numeracy, and responsible use of digital services.',
        sourceName: 'DIKSHA',
        sourceUrl: 'https://diksha.gov.in/',
      },
      {
        title: 'Compare recognized digital-skills courses',
        description: 'Check course provider, certificate, cost, and local availability.',
        sourceName: 'Skill India Digital Hub',
        sourceUrl: 'https://www.skillindiadigital.gov.in/',
      },
    ],
    examOptions: [],
    guidanceNote: 'This skills pathway does not require a national entrance exam.',
  },
  'home-food-enterprise': {
    learningSteps: [
      {
        title: 'Practice budgeting and measurement',
        description: 'Use school mathematics to estimate quantities, costs, and prices.',
        sourceName: 'DIKSHA',
        sourceUrl: 'https://diksha.gov.in/',
      },
      {
        title: 'Explore entrepreneurship learning',
        description: 'Check available skill courses and local support before investing money.',
        sourceName: 'Skill India Digital Hub',
        sourceUrl: 'https://www.skillindiadigital.gov.in/',
      },
    ],
    examOptions: [],
    guidanceNote: 'This learning direction does not require a national entrance exam.',
  },
  'solar-technician': {
    learningSteps: [
      {
        title: 'Strengthen electricity and safety basics',
        description:
          'Review school science and never practice electrical work without supervision.',
        sourceName: 'DIKSHA',
        sourceUrl: 'https://diksha.gov.in/',
      },
      {
        title: 'Find verified technical training',
        description: 'Confirm provider recognition, equipment access, fees, and placement claims.',
        sourceName: 'Skill India Digital Hub',
        sourceUrl: 'https://www.skillindiadigital.gov.in/',
      },
      {
        title: 'Explore on-the-job learning',
        description: 'Check age, qualification, employer, stipend, and safety requirements.',
        sourceName: 'Apprenticeship India',
        sourceUrl: 'https://www.apprenticeshipindia.gov.in/',
      },
    ],
    examOptions: [],
    guidanceNote:
      'Training and apprenticeship eligibility varies by course and employer; no entrance exam is implied.',
  },
  'health-community-worker': {
    learningSteps: [
      {
        title: 'Build biology and communication foundations',
        description:
          'Use school learning resources and practice explaining health information safely.',
        sourceName: 'DIKSHA',
        sourceUrl: 'https://diksha.gov.in/',
      },
      {
        title: 'Check recognized healthcare training',
        description:
          'Verify accreditation, age rules, supervision, fees, and the scope of practice.',
        sourceName: 'Skill India Digital Hub',
        sourceUrl: 'https://www.skillindiadigital.gov.in/',
      },
    ],
    examOptions: [
      {
        name: 'NEET (UG)',
        url: 'https://neet.nta.nic.in/',
        relevance:
          'Only for students considering eligible undergraduate medical courses; it is not required for community health-support work.',
      },
    ],
    guidanceNote:
      'Do not provide medical advice or perform clinical tasks without recognized training and supervision.',
  },
  'repair-and-electrical': {
    learningSteps: [
      {
        title: 'Learn measurement and electrical safety',
        description: 'Start with supervised, low-risk practice and school science concepts.',
        sourceName: 'DIKSHA',
        sourceUrl: 'https://diksha.gov.in/',
      },
      {
        title: 'Compare technical courses and apprenticeships',
        description:
          'Confirm the training centre, tools, safety practice, qualification, and stipend.',
        sourceName: 'Skill India Digital Hub',
        sourceUrl: 'https://www.skillindiadigital.gov.in/',
      },
    ],
    examOptions: [],
    guidanceNote: 'This vocational route does not imply a national entrance exam.',
  },
  'agriculture-science': {
    learningSteps: [
      {
        title: 'Strengthen biology, chemistry, and mathematics',
        description: 'Build subject foundations before choosing a course or entrance route.',
        sourceName: 'DIKSHA',
        sourceUrl: 'https://diksha.gov.in/',
      },
      {
        title: 'Explore university and open courses',
        description: 'Compare agriculture and science courses, prerequisites, and certificates.',
        sourceName: 'SWAYAM',
        sourceUrl: 'https://swayam.gov.in/',
      },
    ],
    examOptions: [
      {
        name: 'CUET (UG)',
        url: 'https://cuet.nta.nic.in/',
        relevance:
          'Some participating universities use CUET for admission; check the exact course, subjects, and current bulletin.',
      },
    ],
    guidanceNote:
      'Entrance tests and subject requirements depend on the institution and programme.',
  },
  'commerce-and-technology': {
    learningSteps: [
      {
        title: 'Strengthen mathematics, communication, and digital basics',
        description:
          'Choose school-level learning that matches the subjects required by your goal.',
        sourceName: 'DIKSHA',
        sourceUrl: 'https://diksha.gov.in/',
      },
      {
        title: 'Try a self-paced course',
        description:
          'Compare introductory courses, language, prerequisites, and certification details.',
        sourceName: 'SWAYAM',
        sourceUrl: 'https://swayam.gov.in/',
      },
    ],
    examOptions: [
      {
        name: 'CUET (UG)',
        url: 'https://cuet.nta.nic.in/',
        relevance:
          'Some participating universities use CUET for admission; check the exact course, subjects, and current bulletin.',
      },
    ],
    guidanceNote:
      'Admission routes vary by university and course; this suggestion is not an eligibility decision.',
  },
};

const fallbackGuidance: PathwayLearningGuidance = {
  learningSteps: [
    {
      title: 'Start with relevant school learning',
      description:
        'Choose one subject or skill to practice next, then review your progress with a facilitator.',
      sourceName: 'DIKSHA',
      sourceUrl: 'https://diksha.gov.in/',
    },
    {
      title: 'Compare a recognized course',
      description:
        'Check language, prerequisites, fees, certification, and provider before enrolling.',
      sourceName: 'Skill India Digital Hub',
      sourceUrl: 'https://www.skillindiadigital.gov.in/',
    },
  ],
  examOptions: [],
  guidanceNote: 'Exam and course eligibility must be checked against current official notices.',
};

export function pathwayLearningGuidance(slug: string): PathwayLearningGuidance {
  const guidance = guidanceBySlug[slug] ?? fallbackGuidance;
  return {
    ...guidance,
    learningSteps: guidance.learningSteps.map((step) => ({ ...step })),
    examOptions: guidance.examOptions.map((exam) => ({ ...exam })),
  };
}
