import { GraduationCap, Globe, Award, Newspaper } from 'lucide-react';

/**
 * Single source of truth for how each Opportunity type is presented across
 * the Discover pages. `type` is what the backend expects; `slug` is the URL
 * segment; everything else is UI. Keep this in sync with the enum in
 * backend/models/Opportunity.js.
 */
export const TYPE_CONFIGS = [
  {
    type: 'fdp',
    slug: 'fdps',
    label: 'FDPs',
    singular: 'FDP',
    Icon: GraduationCap,
    color: '#6C5CE7',
    emoji: '🎓',
    heroTitle: 'Faculty Development Programmes',
    heroSubtitle:
      'AICTE-approved and institute-run FDPs, cross-checked so you know they count toward CPD credits.',
    emptyTitle: 'No FDPs match your filters',
    emptyDescription: 'Try broader filters, or come back tomorrow — new programmes get added daily.',
  },
  {
    type: 'conference',
    slug: 'conferences',
    label: 'Conferences',
    singular: 'Conference',
    Icon: Globe,
    color: '#00B894',
    emoji: '🌐',
    heroTitle: 'Conferences & Symposia',
    heroSubtitle:
      'Peer-reviewed conferences from Scopus-indexed and CORE-ranked venues, filtered against predatory lists.',
    emptyTitle: 'No conferences match your filters',
    emptyDescription: 'Loosen the filters to see more, or check back closer to submission season.',
  },
  {
    type: 'grant',
    slug: 'grants',
    label: 'Grants',
    singular: 'Grant',
    Icon: Award,
    color: '#F59E0B',
    emoji: '💰',
    heroTitle: 'Research Grants',
    heroSubtitle:
      'Open calls from DST, DBT, SERB, ICSSR, MeitY, MoES, and industry — with amount, deadline, and career-stage clearly surfaced.',
    emptyTitle: 'No grant calls match your filters',
    emptyDescription: 'Try clearing filters — call windows are usually short so the list moves quickly.',
  },
  {
    type: 'journal',
    slug: 'journals',
    label: 'Journals',
    singular: 'Journal',
    Icon: Newspaper,
    color: '#1A237E',
    emoji: '📚',
    heroTitle: 'Journals & CFPs',
    heroSubtitle:
      'UGC-CARE listed and Scopus-indexed journals with open calls for papers. Every listing shows when it was last verified against UGC-CARE.',
    emptyTitle: 'No journals match your filters',
    emptyDescription: 'Widen the filters — remember predatory journals are deliberately excluded here.',
  },
];

export const TYPE_META = Object.fromEntries(TYPE_CONFIGS.map(c => [c.type, c]));
export const SLUG_META = Object.fromEntries(TYPE_CONFIGS.map(c => [c.slug, c]));
