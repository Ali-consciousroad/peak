// Predefined skills for the high-end freelance marketplace
// All freelancers are considered experts by default

export const SKILL_CATEGORIES = {
  DEVELOPMENT: 'Development',
  DESIGN: 'Design', 
  MARKETING: 'Marketing',
  CONSULTING: 'Consulting',
  WRITING: 'Writing',
  DATA: 'Data & Analytics',
  MOBILE: 'Mobile Development',
  DEVOPS: 'DevOps & Infrastructure'
} as const;

export const PREDEFINED_SKILLS = {
  [SKILL_CATEGORIES.DEVELOPMENT]: [
    'React',
    'Vue.js',
    'Angular',
    'Node.js',
    'Python',
    'Java',
    'C#',
    'PHP',
    'Ruby on Rails',
    'Go',
    'Rust',
    'TypeScript',
    'JavaScript',
    'Next.js',
    'Nuxt.js',
    'Express.js',
    'Django',
    'Flask',
    'Spring Boot',
    'Laravel',
    'Symfony'
  ],
  [SKILL_CATEGORIES.MOBILE]: [
    'React Native',
    'Flutter',
    'iOS Development',
    'Android Development',
    'Swift',
    'Kotlin',
    'Xamarin',
    'Ionic'
  ],
  [SKILL_CATEGORIES.DESIGN]: [
    'UI/UX Design',
    'Product Design',
    'Graphic Design',
    'Web Design',
    'Mobile Design',
    'Figma',
    'Sketch',
    'Adobe XD',
    'Photoshop',
    'Illustrator',
    'InDesign',
    'Prototyping',
    'User Research',
    'Design Systems'
  ],
  [SKILL_CATEGORIES.MARKETING]: [
    'Digital Marketing',
    'SEO',
    'SEM',
    'Social Media Marketing',
    'Content Marketing',
    'Email Marketing',
    'PPC Advertising',
    'Google Ads',
    'Facebook Ads',
    'Marketing Strategy',
    'Brand Strategy',
    'Growth Hacking',
    'Analytics',
    'Conversion Optimization'
  ],
  [SKILL_CATEGORIES.CONSULTING]: [
    'Business Strategy',
    'Product Strategy',
    'Technical Consulting',
    'Digital Transformation',
    'Process Optimization',
    'Project Management',
    'Agile/Scrum',
    'Change Management',
    'Operations Consulting'
  ],
  [SKILL_CATEGORIES.WRITING]: [
    'Technical Writing',
    'Content Writing',
    'Copywriting',
    'Blog Writing',
    'SEO Writing',
    'Grant Writing',
    'Proposal Writing',
    'Documentation',
    'Translation'
  ],
  [SKILL_CATEGORIES.DATA]: [
    'Data Analysis',
    'Data Science',
    'Machine Learning',
    'AI/ML',
    'Business Intelligence',
    'Data Visualization',
    'SQL',
    'Python (Data)',
    'R',
    'Tableau',
    'Power BI',
    'Big Data',
    'Statistics'
  ],
  [SKILL_CATEGORIES.DEVOPS]: [
    'AWS',
    'Azure',
    'Google Cloud',
    'Docker',
    'Kubernetes',
    'CI/CD',
    'Terraform',
    'Ansible',
    'Jenkins',
    'GitLab CI',
    'GitHub Actions',
    'Linux',
    'Server Administration',
    'Monitoring',
    'Security'
  ]
} as const;

export type SkillCategory = typeof SKILL_CATEGORIES[keyof typeof SKILL_CATEGORIES];

export function getSkillsByCategory(category: SkillCategory): string[] {
  return PREDEFINED_SKILLS[category] || [];
}

export function getAllSkills(): { category: SkillCategory; skills: string[] }[] {
  return Object.entries(PREDEFINED_SKILLS).map(([category, skills]) => ({
    category: category as SkillCategory,
    skills
  }));
}
