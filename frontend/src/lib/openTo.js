// Intent flags a faculty declares on their profile — mirrored on the
// backend as Faculty.openTo. Kept in sync manually with
// models/Faculty.js OPEN_TO_OPTIONS.

export const OPEN_TO_META = {
  co_author: {
    short: 'Co-author',
    long: 'Open to co-authoring a paper',
    hint: 'You want collaborators to reach out about joint publications.',
  },
  phd_student: {
    short: 'PhD student',
    long: 'Open to taking on a PhD student',
    hint: 'You have supervision capacity for new research students.',
  },
  co_pi: {
    short: 'Co-PI',
    long: 'Open to Co-PI / Co-investigator roles on grants',
    hint: 'You want to be considered when peers write grant applications.',
  },
  reviewer: {
    short: 'Reviewer',
    long: 'Open to peer-reviewing manuscripts',
    hint: 'Editors and colleagues can approach you for journal / conference reviews.',
  },
};

export const OPEN_TO_ORDER = ['co_author', 'phd_student', 'co_pi', 'reviewer'];
