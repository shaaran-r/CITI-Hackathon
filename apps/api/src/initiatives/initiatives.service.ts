import type { InitiativeSource } from '@kaushalsetu/types';

export const officialInitiativeSources: InitiativeSource[] = [
  {
    id: 'diksha',
    name: 'DIKSHA',
    category: 'School education',
    overview:
      'Curriculum-aligned digital textbooks, learning resources, and teacher development content.',
    officialUrl: 'https://diksha.gov.in/',
    useFor: 'Explore school-level learning resources by grade, subject, board, and language.',
    dataStatus: 'REFERENCE_ONLY',
  },
  {
    id: 'swayam',
    name: 'SWAYAM',
    category: 'Higher education and online learning',
    overview:
      'Online courses from universities and national coordinators, with self-paced learning and certification options.',
    officialUrl: 'https://swayam.gov.in/',
    useFor: 'Find courses that can extend a chosen academic or vocational pathway.',
    dataStatus: 'REFERENCE_ONLY',
  },
  {
    id: 'skill-india-digital',
    name: 'Skill India Digital Hub',
    category: 'Vocational training and workforce development',
    overview:
      'Government skill courses, training-centre discovery, job exchange, and apprenticeship opportunities.',
    officialUrl: 'https://www.skillindiadigital.gov.in/',
    useFor: 'Explore skill courses, recognized training, job roles, and nearby opportunities.',
    dataStatus: 'REFERENCE_ONLY',
  },
  {
    id: 'naps',
    name: 'National Apprenticeship Promotion Scheme',
    category: 'Apprenticeship and industry training',
    overview:
      'Apprenticeship information and training pathways connecting candidates and employers.',
    officialUrl: 'https://www.apprenticeshipindia.gov.in/',
    useFor: 'Check current apprenticeship openings, eligibility, stipend, and employer details.',
    dataStatus: 'REFERENCE_ONLY',
  },
  {
    id: 'national-scholarship-portal',
    name: 'National Scholarship Portal',
    category: 'Student financial aid',
    overview:
      'Government scholarship discovery, registration, application, and status services for eligible students.',
    officialUrl: 'https://scholarships.gov.in/',
    useFor:
      'Confirm the current academic-year schemes, eligibility rules, dates, and application steps.',
    dataStatus: 'REFERENCE_ONLY',
  },
  {
    id: 'aishe',
    name: 'All India Survey on Higher Education',
    category: 'Educational data and policy research',
    overview:
      'Official higher-education statistics and reports about institutions, enrolment, programmes, and infrastructure.',
    officialUrl: 'https://aishe.gov.in/',
    useFor:
      'Use reports and dashboards as context for higher-education exploration, not individual eligibility.',
    dataStatus: 'REFERENCE_ONLY',
  },
  {
    id: 'bhashini',
    name: 'BHASHINI',
    category: 'AI and language technology',
    overview:
      'National Language Translation Mission resources, language services, and APIs for Indian languages.',
    officialUrl: 'https://bhashini.gov.in/',
    useFor: 'Learn about language technology services; API access requires BHASHINI onboarding.',
    dataStatus: 'REFERENCE_ONLY',
  },
];

export class InitiativesService {
  list(): InitiativeSource[] {
    return officialInitiativeSources.map((source) => ({ ...source }));
  }
}
