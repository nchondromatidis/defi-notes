import type { Item } from '@/components/ProjectFilesViewer.tsx';

export const DEFAULT_ITEMS: Record<string, Item> = {
  apis: { name: 'APIs' },
  backend: { children: ['apis', 'infrastructure'], name: 'Backend' },
  company: {
    children: ['engineering', 'marketing', 'operations'],
    name: 'Company',
  },
  components: { name: 'Components' },
  content: { name: 'Content' },
  'design-system': {
    children: ['components', 'tokens', 'guidelines'],
    name: 'Design System',
  },
  engineering: {
    children: ['frontend', 'backend', 'platform-team'],
    name: 'Engineering',
  },
  finance: { name: 'Finance' },
  frontend: { children: ['design-system', 'web-platform'], name: 'Frontend' },
  guidelines: { name: 'Guidelines' },
  hr: { name: 'HR' },
  infrastructure: { name: 'Infrastructure' },
  marketing: { children: ['content', 'seo'], name: 'Marketing' },
  operations: { children: ['hr', 'finance'], name: 'Operations' },
  'platform-team': { name: 'Platform Team' },
  seo: { name: 'SEO' },
  tokens: { name: 'Tokens' },
  'web-platform': { name: 'Web Platform' },
};

export const DEFAULT_INITIAL_EXPANDED_ITEMS: string[] = ['engineering', 'frontend', 'design-system'];
