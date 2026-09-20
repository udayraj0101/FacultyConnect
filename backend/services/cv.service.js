import PDFDocument from 'pdfkit';
import { Faculty } from '../models/Faculty.js';
import { Publication } from '../models/Publication.js';
import { createLogger } from '../utils/logger.js';
import { computeResearchScore, UGC_2018_API_RULES } from './cas.service.js';

const logger = createLogger('cv.service');

const COLORS = {
  primary: '#6C5CE7',
  secondary: '#1A237E',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#E5E7EB',
  accent: '#00B894',
};

function safeFilename(name) {
  return (name || 'faculty')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function sectionHeader(doc, title) {
  doc
    .moveDown(0.6)
    .fillColor(COLORS.secondary)
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(title.toUpperCase(), { characterSpacing: 1 });
  const y = doc.y + 2;
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .lineWidth(0.5)
    .strokeColor(COLORS.border)
    .stroke();
  doc.moveDown(0.4);
}

function labelValue(doc, label, value, options = {}) {
  const startX = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc
    .fillColor(COLORS.muted)
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(label.toUpperCase(), startX, doc.y, { characterSpacing: 0.5, width });
  doc.fillColor(COLORS.text).font('Helvetica').fontSize(11).text(value, {
    width,
    ...options,
  });
  doc.moveDown(0.4);
}

function metricBox(doc, x, y, w, h, label, value) {
  doc.roundedRect(x, y, w, h, 6).lineWidth(0.5).strokeColor(COLORS.border).stroke();
  doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(8).text(label.toUpperCase(), x + 10, y + 10, {
    width: w - 20,
    characterSpacing: 0.4,
  });
  doc.fillColor(COLORS.secondary).font('Helvetica-Bold').fontSize(18).text(String(value), x + 10, y + 26, {
    width: w - 20,
  });
}

function renderMetrics(doc, faculty, publicationsCount) {
  const startX = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const gap = 10;
  const boxW = (width - gap * 3) / 4;
  const boxH = 56;
  const y = doc.y;
  metricBox(doc, startX, y, boxW, boxH, 'Citations', faculty.citationCount || 0);
  metricBox(doc, startX + (boxW + gap), y, boxW, boxH, 'h-index', faculty.hIndex || 0);
  metricBox(doc, startX + 2 * (boxW + gap), y, boxW, boxH, 'i10-index', faculty.i10Index || 0);
  metricBox(doc, startX + 3 * (boxW + gap), y, boxW, boxH, 'Publications', publicationsCount || 0);
  doc.y = y + boxH + 10;
}

function renderTags(doc, tags) {
  if (!tags || tags.length === 0) return;
  const startX = doc.page.margins.left;
  const maxX = doc.page.width - doc.page.margins.right;
  let x = startX;
  let y = doc.y;
  const rowHeight = 22;
  const padX = 10;
  const padY = 5;
  doc.font('Helvetica').fontSize(10);
  for (const tag of tags) {
    const w = doc.widthOfString(tag) + padX * 2;
    if (x + w > maxX) {
      x = startX;
      y += rowHeight;
    }
    doc
      .roundedRect(x, y, w, rowHeight - 6, 10)
      .fillOpacity(0.08)
      .fillColor(COLORS.primary)
      .fill();
    doc
      .fillOpacity(1)
      .fillColor(COLORS.primary)
      .text(tag, x + padX, y + padY, { lineBreak: false });
    x += w + 6;
  }
  doc.y = y + rowHeight;
}

function renderPublications(doc, publications) {
  if (!publications.length) {
    doc.fillColor(COLORS.muted).font('Helvetica-Oblique').fontSize(11).text('No publications on file yet.');
    return;
  }
  const grouped = new Map();
  for (const pub of publications) {
    const key = pub.year || 'Undated';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(pub);
  }
  const years = Array.from(grouped.keys()).sort((a, b) => {
    if (a === 'Undated') return 1;
    if (b === 'Undated') return -1;
    return b - a;
  });
  for (const year of years) {
    doc.moveDown(0.3);
    doc
      .fillColor(COLORS.secondary)
      .font('Helvetica-Bold')
      .fontSize(11)
      .text(String(year));
    for (const pub of grouped.get(year)) {
      doc.moveDown(0.2);
      doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(10.5).text(pub.title, {
        continued: false,
      });
      const parts = [];
      if (pub.authors?.length) {
        const authorList =
          pub.authors.length > 6
            ? `${pub.authors.slice(0, 6).join(', ')} +${pub.authors.length - 6} more`
            : pub.authors.join(', ');
        parts.push(authorList);
      }
      if (pub.venue) parts.push(pub.venue);
      if (parts.length) {
        doc.fillColor(COLORS.muted).font('Helvetica-Oblique').fontSize(10).text(parts.join(' · '));
      }
      const meta = [];
      if (pub.doi) meta.push(`DOI ${pub.doi}`);
      if (typeof pub.citationCount === 'number' && pub.citationCount > 0) {
        meta.push(`Cited by ${pub.citationCount}`);
      }
      const sourceMap = { orcid: 'ORCID', scopus: 'Scopus', scholar_csv: 'Scholar CSV', manual: 'Manual' };
      meta.push(sourceMap[pub.source] || pub.source);
      doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9).text(meta.join(' · '));
    }
  }
}

export async function renderFacultyCv(facultyId) {
  const faculty = await Faculty.findById(facultyId).populate(
    'institutionId',
    'name domain verificationStatus',
  );
  if (!faculty) {
    const err = new Error('Faculty not found');
    err.code = 'FACULTY_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  const publications = await Publication.find({ facultyId }).sort({ year: -1, createdAt: -1 });

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));

  const finished = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  // Header band
  doc.fillColor(COLORS.secondary).font('Helvetica-Bold').fontSize(24).text(faculty.name);
  const designationLine = [
    faculty.designation === 'Professor' ? 'Professor' : `${faculty.designation} Professor`,
    faculty.institutionId?.name,
  ]
    .filter(Boolean)
    .join(' · ');
  if (designationLine) {
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(12).text(designationLine);
  }
  const contact = [faculty.email, faculty.phone].filter(Boolean).join(' · ');
  if (contact) doc.fillColor(COLORS.muted).fontSize(10).text(contact);
  if (faculty.orcidId) {
    doc.fillColor(COLORS.primary).fontSize(10).text(`ORCID iD: ${faculty.orcidId}`);
  }

  sectionHeader(doc, 'Research metrics');
  renderMetrics(doc, faculty, publications.length);

  if (faculty.domainTags?.length) {
    sectionHeader(doc, 'Research domains');
    renderTags(doc, faculty.domainTags);
  }

  sectionHeader(doc, 'Publications');
  renderPublications(doc, publications);

  doc.moveDown(2);
  const generatedAt = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  doc.fillColor(COLORS.muted).font('Helvetica-Oblique').fontSize(8).text(
    `Generated by FacultyConnect · ${generatedAt}`,
    { align: 'center' },
  );

  doc.end();
  const buffer = await finished;

  logger.info('cv rendered', { facultyId, bytes: buffer.length, publications: publications.length });
  return {
    buffer,
    filename: `cv-${safeFilename(faculty.name)}.pdf`,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// UGC CAS-9 CV template
// ─────────────────────────────────────────────────────────────────────────
//
// Modelled on the UGC Regulations 2018 Appendix III promotion proforma
// (widely known as the "CAS Form" or "Form 9") that Indian universities
// use for Career Advancement Scheme applications. The proforma is a
// long-form CV with rigid section ordering — HR offices reject
// re-ordered submissions — so we hew to the standard headings even when
// a section is empty on the given faculty's profile.
//
// The layout is deliberately monochrome-formal (black text, sparse rules)
// rather than the branded gradient look of the Generic CV: promotion
// applications are official documents and reviewers expect a plain,
// photocopyable look.

const CAS_COLORS = {
  ink: '#111827',
  muted: '#4B5563',
  rule: '#9CA3AF',
  softRule: '#E5E7EB',
  accent: '#1F2937',
};

// PDFKit's flowing text calls remember `doc.x` from the last write, so a
// table cell that ended on the right side of the page leaves the next
// paragraph pinned to that column. Every helper below starts by
// resetting the cursor to the left margin so headings always span the
// full width. Same reason `casSectionHeader` and every standalone text
// block below call this first.
function resetToLeft(doc) {
  doc.x = doc.page.margins.left;
}

// Sub-headings on the proforma are numbered — HR offices cross-check by
// section number, so we keep them in the rendered PDF.
function casSectionHeader(doc, number, title) {
  resetToLeft(doc);
  doc.moveDown(0.6);
  resetToLeft(doc);
  doc
    .fillColor(CAS_COLORS.ink)
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(`${number}. ${title.toUpperCase()}`, {
      characterSpacing: 0.6,
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
    });
  const y = doc.y + 2;
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .lineWidth(0.7)
    .strokeColor(CAS_COLORS.rule)
    .stroke();
  doc.moveDown(0.35);
  resetToLeft(doc);
}

// Two-column key/value rows used across the personal-info block. Wraps
// cleanly if the value overflows.
function casKeyValue(doc, label, value) {
  resetToLeft(doc);
  const startX = doc.page.margins.left;
  const totalW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const labelW = 150;
  const valueX = startX + labelW;
  const valueW = totalW - labelW;
  const rowTop = doc.y;
  doc
    .fillColor(CAS_COLORS.muted)
    .font('Helvetica-Bold')
    .fontSize(9)
    .text(label, startX, rowTop, { width: labelW - 8 });
  doc
    .fillColor(CAS_COLORS.ink)
    .font('Helvetica')
    .fontSize(10)
    .text(value || '—', valueX, rowTop, { width: valueW });
  doc.moveDown(0.2);
}

// Generic table renderer: headers row + striped body rows. Auto-wraps
// long text within a cell. Used for education, positions held, projects.
function casTable(doc, columns, rows) {
  resetToLeft(doc);
  if (!rows.length) {
    doc
      .fillColor(CAS_COLORS.muted)
      .font('Helvetica-Oblique')
      .fontSize(10)
      .text('(No records on file.)');
    doc.moveDown(0.3);
    resetToLeft(doc);
    return;
  }
  const startX = doc.page.margins.left;
  const totalW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const flexTotal = columns.reduce((s, c) => s + (c.flex || 1), 0);
  const widths = columns.map(c => Math.floor((totalW * (c.flex || 1)) / flexTotal));
  const rowPadY = 4;
  const rowPadX = 6;

  // Header
  let y = doc.y;
  doc.rect(startX, y, totalW, 16).fillColor(CAS_COLORS.softRule).fill();
  doc.fillColor(CAS_COLORS.ink).font('Helvetica-Bold').fontSize(9);
  let x = startX;
  for (let i = 0; i < columns.length; i += 1) {
    doc.text(columns[i].header, x + rowPadX, y + rowPadY, {
      width: widths[i] - rowPadX * 2,
      lineBreak: false,
    });
    x += widths[i];
  }
  y += 16;

  // Body
  doc.font('Helvetica').fontSize(9.5);
  for (const row of rows) {
    // Measure each cell's rendered height so the row grows to fit the
    // tallest cell. PDFKit's heightOfString is cheap and accurate.
    const cellTexts = columns.map((c, i) => {
      const raw = row[c.key] ?? '';
      return String(raw);
    });
    const cellHeights = cellTexts.map((t, i) =>
      doc.heightOfString(t || ' ', {
        width: widths[i] - rowPadX * 2,
      }),
    );
    const rowH = Math.max(...cellHeights) + rowPadY * 2;

    // Page break if we'd overflow.
    if (y + rowH > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.y;
    }
    x = startX;
    for (let i = 0; i < columns.length; i += 1) {
      doc
        .fillColor(CAS_COLORS.ink)
        .text(cellTexts[i] || '—', x + rowPadX, y + rowPadY, {
          width: widths[i] - rowPadX * 2,
        });
      x += widths[i];
    }
    // Row separator
    doc
      .moveTo(startX, y + rowH)
      .lineTo(startX + totalW, y + rowH)
      .lineWidth(0.3)
      .strokeColor(CAS_COLORS.softRule)
      .stroke();
    y += rowH;
  }
  doc.y = y + 2;
  resetToLeft(doc);
}

function casNumberedList(doc, items) {
  resetToLeft(doc);
  if (!items.length) {
    doc
      .fillColor(CAS_COLORS.muted)
      .font('Helvetica-Oblique')
      .fontSize(10)
      .text('(No records on file.)');
    doc.moveDown(0.3);
    resetToLeft(doc);
    return;
  }
  const startX = doc.page.margins.left;
  const totalW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const indent = 22;
  let i = 1;
  for (const line of items) {
    // Page-break check FIRST — addPage() resets doc.y, so capturing the
    // top-of-row y before this check would leave the body text pinned to
    // the previous page's near-bottom coordinate on the new page.
    if (doc.y + 30 > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }
    const y = doc.y;
    doc
      .fillColor(CAS_COLORS.muted)
      .font('Helvetica-Bold')
      .fontSize(9.5)
      .text(`${i}.`, startX, y, { width: indent - 4, continued: false });
    doc
      .fillColor(CAS_COLORS.ink)
      .font('Helvetica')
      .fontSize(10)
      .text(line, startX + indent, y, { width: totalW - indent });
    doc.moveDown(0.15);
    i += 1;
  }
  resetToLeft(doc);
}

// Signature block at the very end — one of the required elements of an
// official CAS submission (blank line for signature above date/place).
function casSignatureBlock(doc) {
  doc.moveDown(1.5);
  const startX = doc.page.margins.left;
  const totalW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const y = doc.y;
  const leftW = totalW * 0.45;
  doc
    .fillColor(CAS_COLORS.muted)
    .font('Helvetica')
    .fontSize(9.5)
    .text('Place: __________________________', startX, y);
  doc.text('Date:  __________________________', startX, y + 18);
  doc
    .font('Helvetica-Bold')
    .fontSize(9.5)
    .text('(Signature of the applicant)', startX + totalW - 180, y + 18, {
      width: 180,
      align: 'right',
    });
}

function fmtInr(amount) {
  if (amount == null || amount === '') return '—';
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `Rs. ${n.toLocaleString('en-IN')}`;
}

function fmtYearRange(from, to, current) {
  if (!from && !to && !current) return '—';
  const start = from || '';
  const end = current ? 'Present' : to || '';
  if (!start && !end) return '—';
  if (start && end) return `${start} – ${end}`;
  return String(start || end);
}

/**
 * Render the UGC CAS-9 CV. Sections match the Appendix III proforma
 * headings and numbering. Empty sections still render with a placeholder
 * "(No records on file.)" — HR offices skip missing sections but
 * reviewers flag them, so we surface the gap so the faculty sees it too.
 */
export async function renderUgcCasCv(facultyId) {
  const faculty = await Faculty.findById(facultyId).populate(
    'institutionId',
    'name domain verificationStatus',
  );
  if (!faculty) {
    const err = new Error('Faculty not found');
    err.code = 'FACULTY_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  const publications = await Publication.find({ facultyId }).sort({ year: -1, createdAt: -1 });
  const casResult = await computeResearchScore(facultyId);
  const manual = faculty.casManualInputs || {};

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));
  const finished = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  // ── Header — official-form styling
  const titleW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc
    .fillColor(CAS_COLORS.ink)
    .font('Helvetica-Bold')
    .fontSize(14)
    .text('APPLICATION FOR PROMOTION UNDER CAS', doc.page.margins.left, doc.y, {
      width: titleW,
      align: 'center',
      characterSpacing: 0.5,
    });
  doc
    .fillColor(CAS_COLORS.muted)
    .font('Helvetica')
    .fontSize(10)
    .text('UGC Regulations 2018 — Appendix III (Form 9)', doc.page.margins.left, doc.y, {
      width: titleW,
      align: 'center',
    });
  doc.moveDown(0.4);
  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .lineWidth(1)
    .strokeColor(CAS_COLORS.ink)
    .stroke();
  doc.moveDown(0.6);

  // ── 1. Personal information
  casSectionHeader(doc, '1', 'Personal Information');
  casKeyValue(doc, 'Name', faculty.name);
  casKeyValue(
    doc,
    'Current Designation',
    faculty.designation === 'Professor'
      ? 'Professor'
      : `${faculty.designation || ''} Professor`,
  );
  casKeyValue(doc, 'Department', faculty.department);
  casKeyValue(doc, 'Institution', faculty.institutionId?.name);
  casKeyValue(doc, 'Email', faculty.email);
  casKeyValue(doc, 'Phone', faculty.phone);
  if (faculty.orcidId) casKeyValue(doc, 'ORCID iD', faculty.orcidId);
  if (faculty.scopusAuthorId) casKeyValue(doc, 'Scopus Author ID', faculty.scopusAuthorId);

  // ── 2. Educational qualifications
  casSectionHeader(doc, '2', 'Educational Qualifications');
  casTable(
    doc,
    [
      { header: 'Degree', key: 'degree', flex: 1 },
      { header: 'Field / Specialisation', key: 'field', flex: 1.3 },
      { header: 'Institution', key: 'institution', flex: 1.6 },
      { header: 'Year', key: 'year', flex: 0.5 },
    ],
    (faculty.education || []).map(e => ({
      degree: e.degree || '—',
      field: e.field || '—',
      institution: e.institution || '—',
      year: e.year != null ? String(e.year) : '—',
    })),
  );

  // ── 3. Positions held
  casSectionHeader(doc, '3', 'Positions Held');
  casTable(
    doc,
    [
      { header: 'Institution', key: 'institution', flex: 1.6 },
      { header: 'Designation', key: 'designation', flex: 1.2 },
      { header: 'Period', key: 'period', flex: 0.9 },
    ],
    (faculty.employmentHistory || []).map(e => ({
      institution: e.institution,
      designation: e.designation || '—',
      period: fmtYearRange(e.from, e.to, e.current),
    })),
  );

  // ── 4. Research contributions
  //    4a. Publications (peer-reviewed)
  casSectionHeader(doc, '4a', 'Publications in Peer-Reviewed / UGC-Listed Journals');
  const pubLines = publications.map(p => {
    const authors = p.authors?.length
      ? p.authors.length > 6
        ? `${p.authors.slice(0, 6).join(', ')} et al.`
        : p.authors.join(', ')
      : '';
    const bits = [];
    if (authors) bits.push(authors);
    if (p.year) bits.push(`(${p.year})`);
    bits.push(`"${p.title}"`);
    if (p.venue) bits.push(p.venue);
    if (p.doi) bits.push(`DOI: ${p.doi}`);
    return bits.join(' ');
  });
  casNumberedList(doc, pubLines);

  //    4b. Books & chapters (from CAS manual inputs)
  casSectionHeader(doc, '4b', 'Books, Chapters & Editorship');
  const bookLines = [];
  if (manual.booksInternational)
    bookLines.push(`Books authored — International publisher: ${manual.booksInternational}`);
  if (manual.booksNational)
    bookLines.push(`Books authored — National publisher: ${manual.booksNational}`);
  if (manual.chaptersInternational)
    bookLines.push(`Book chapters — International: ${manual.chaptersInternational}`);
  if (manual.chaptersNational)
    bookLines.push(`Book chapters — National: ${manual.chaptersNational}`);
  if (manual.editorInternational)
    bookLines.push(`Editor — International volume: ${manual.editorInternational}`);
  if (manual.editorNational)
    bookLines.push(`Editor — National volume: ${manual.editorNational}`);
  casNumberedList(doc, bookLines);

  //    4c. Sponsored research projects
  casSectionHeader(doc, '4c', 'Sponsored Research Projects');
  casTable(
    doc,
    [
      { header: 'Title', key: 'title', flex: 2 },
      { header: 'Agency', key: 'agency', flex: 1 },
      { header: 'Role', key: 'role', flex: 0.6 },
      { header: 'Amount', key: 'amount', flex: 0.9 },
      { header: 'Status', key: 'status', flex: 0.7 },
    ],
    (faculty.grantsReceived || []).map(g => ({
      title: g.title,
      agency: g.agency || '—',
      role: g.role || 'PI',
      amount: fmtInr(g.amount),
      status: g.ongoing ? 'Ongoing' : g.year ? String(g.year) : 'Completed',
    })),
  );

  //    4d. Consultancy
  casSectionHeader(doc, '4d', 'Consultancy');
  const fullW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  if (manual.consultancyLakhs && manual.consultancyLakhs > 0) {
    doc
      .fillColor(CAS_COLORS.ink)
      .font('Helvetica')
      .fontSize(10)
      .text(
        `Total consultancy earnings on record: Rs. ${manual.consultancyLakhs} lakh.`,
        doc.page.margins.left,
        doc.y,
        { width: fullW },
      );
  } else {
    doc
      .fillColor(CAS_COLORS.muted)
      .font('Helvetica-Oblique')
      .fontSize(10)
      .text('(No records on file.)', doc.page.margins.left, doc.y, { width: fullW });
  }

  //    4e. Research guidance
  casSectionHeader(doc, '4e', 'Research Guidance');
  const guidanceRows = [];
  if (manual.phdAwarded)
    guidanceRows.push({ level: 'Ph.D.', status: 'Awarded', count: manual.phdAwarded });
  if (manual.phdOngoing)
    guidanceRows.push({ level: 'Ph.D.', status: 'Ongoing (registered)', count: manual.phdOngoing });
  if (manual.mPhilAwarded)
    guidanceRows.push({ level: 'M.Phil.', status: 'Awarded', count: manual.mPhilAwarded });
  casTable(
    doc,
    [
      { header: 'Level', key: 'level', flex: 1 },
      { header: 'Status', key: 'status', flex: 2 },
      { header: 'Count', key: 'count', flex: 0.6 },
    ],
    guidanceRows.map(r => ({ ...r, count: String(r.count) })),
  );

  // ── 5. Awards & fellowships
  casSectionHeader(doc, '5', 'Awards & Fellowships');
  casNumberedList(
    doc,
    (faculty.awards || []).map(a => {
      const bits = [a.title];
      if (a.year) bits.push(`(${a.year})`);
      if (a.description) bits.push(`— ${a.description}`);
      return bits.join(' ');
    }),
  );

  // ── 6. Invited lectures
  casSectionHeader(doc, '6', 'Invited Lectures & Paper Presentations');
  const lectureLines = [];
  if (manual.invitedLecturesIntlAbroad)
    lectureLines.push(`International (abroad): ${manual.invitedLecturesIntlAbroad}`);
  if (manual.invitedLecturesIntlInIndia)
    lectureLines.push(`International (in India): ${manual.invitedLecturesIntlInIndia}`);
  if (manual.invitedLecturesNational)
    lectureLines.push(`National: ${manual.invitedLecturesNational}`);
  if (manual.invitedLecturesState)
    lectureLines.push(`State / University: ${manual.invitedLecturesState}`);
  casNumberedList(doc, lectureLines);

  // ── 7. Research Score Summary. This is what CAS committees actually
  //   grade against, so we surface the category totals + the computed
  //   grand total prominently.
  casSectionHeader(doc, '7', 'Research Score Summary (UGC 2018 Appendix II Table 2)');
  const categoryLabels = {
    papers: 'Research papers',
    publications: 'Books, chapters, editorship',
    projects: 'Sponsored projects & consultancy',
    guidance: 'Research guidance',
    awards: 'Awards & fellowships',
    lectures: 'Invited lectures',
  };
  casTable(
    doc,
    [
      { header: 'Category', key: 'category', flex: 2 },
      { header: 'Score', key: 'score', flex: 0.6 },
    ],
    Object.entries(casResult.categoryTotals).map(([k, v]) => ({
      category: categoryLabels[k] || k,
      score: String(v),
    })),
  );
  doc.moveDown(0.4);
  const summaryW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc
    .fillColor(CAS_COLORS.ink)
    .font('Helvetica-Bold')
    .fontSize(11)
    .text(
      `Total Research Score: ${casResult.total} points`,
      doc.page.margins.left,
      doc.y,
      { width: summaryW, align: 'right' },
    );
  doc
    .fillColor(CAS_COLORS.muted)
    .font('Helvetica')
    .fontSize(9)
    .text(
      `Eligibility: ${
        casResult.eligibility.qualifiesForProfessor
          ? 'Qualifies for Professor (>=120)'
          : casResult.eligibility.qualifiesForAssociate
            ? `Qualifies for Associate (>=75). ${casResult.eligibility.pointsToProfessor} points to Professor.`
            : `${casResult.eligibility.pointsToAssociate} points to Associate; ${casResult.eligibility.pointsToProfessor} to Professor.`
      }`,
      doc.page.margins.left,
      doc.y,
      { width: summaryW, align: 'right' },
    );

  // ── Declaration + signature (spec item on the CAS proforma)
  casSectionHeader(doc, '8', 'Declaration');
  const declW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc
    .fillColor(CAS_COLORS.ink)
    .font('Helvetica')
    .fontSize(10)
    .text(
      'I hereby declare that the information furnished above is true and correct to the best ' +
        'of my knowledge and belief. I understand that any misrepresentation or omission may ' +
        'result in disciplinary action per the applicable service rules.',
      doc.page.margins.left,
      doc.y,
      { width: declW, align: 'justify' },
    );
  casSignatureBlock(doc);

  // Footer
  doc.moveDown(2);
  const generatedAt = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const footerW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc
    .fillColor(CAS_COLORS.muted)
    .font('Helvetica-Oblique')
    .fontSize(8)
    .text(
      `Generated by FacultyConnect · ${generatedAt} · UGC 2018 CAS proforma layout. ` +
        'The final CAS committee may apply multi-author sharing, journal-classification, and ' +
        'impact-factor tiers not captured in this summary.',
      doc.page.margins.left,
      doc.y,
      { width: footerW, align: 'center' },
    );

  doc.end();
  const buffer = await finished;

  logger.info('cas-9 cv rendered', {
    facultyId,
    bytes: buffer.length,
    publications: publications.length,
    researchScore: casResult.total,
  });
  return {
    buffer,
    filename: `cas9-cv-${safeFilename(faculty.name)}.pdf`,
  };
}

// Silence lint warning for the imported rules table — it's re-exported so
// future callers (a stand-alone scoring endpoint) can reuse it without
// depending on cas.service.
export { UGC_2018_API_RULES };

// ─────────────────────────────────────────────────────────────────────────
// AICTE Faculty CV template
// ─────────────────────────────────────────────────────────────────────────
//
// Modelled on the AICTE Approval Process Handbook faculty proforma
// (Annexure "Faculty Details") that technical institutions submit
// annually and use for EOA / self-disclosure. The template is structured
// as a rigid section list — same helpers as the CAS-9 renderer since
// AICTE's proforma is another table-of-tables format.
//
// Layout goal: single-column, formal, photocopy-friendly. Reuses the
// cas* helpers verbatim (they're style-neutral); only the section
// ordering, numbering and headings differ from the CAS-9 template.

export async function renderAicteCv(facultyId) {
  const faculty = await Faculty.findById(facultyId).populate(
    'institutionId',
    'name domain verificationStatus',
  );
  if (!faculty) {
    const err = new Error('Faculty not found');
    err.code = 'FACULTY_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  const publications = await Publication.find({ facultyId }).sort({ year: -1, createdAt: -1 });
  const manual = faculty.casManualInputs || {};

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));
  const finished = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  // Header
  const titleW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc
    .fillColor(CAS_COLORS.ink)
    .font('Helvetica-Bold')
    .fontSize(14)
    .text('AICTE FACULTY DETAILS', doc.page.margins.left, doc.y, {
      width: titleW,
      align: 'center',
      characterSpacing: 0.5,
    });
  doc
    .fillColor(CAS_COLORS.muted)
    .font('Helvetica')
    .fontSize(10)
    .text('Approval Process Handbook proforma (self-disclosure)', doc.page.margins.left, doc.y, {
      width: titleW,
      align: 'center',
    });
  doc.moveDown(0.4);
  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .lineWidth(1)
    .strokeColor(CAS_COLORS.ink)
    .stroke();
  doc.moveDown(0.6);

  // 1. Personal information — same fields as CAS-9 plus AICTE-specific
  // "areas of specialisation" (drawn from domainTags).
  casSectionHeader(doc, '1', 'Personal Information');
  casKeyValue(doc, 'Name', faculty.name);
  casKeyValue(
    doc,
    'Current Designation',
    faculty.designation === 'Professor'
      ? 'Professor'
      : `${faculty.designation || ''} Professor`,
  );
  casKeyValue(doc, 'Department', faculty.department);
  casKeyValue(doc, 'Institution', faculty.institutionId?.name);
  casKeyValue(doc, 'Email', faculty.email);
  casKeyValue(doc, 'Phone', faculty.phone);
  if (faculty.orcidId) casKeyValue(doc, 'ORCID iD', faculty.orcidId);
  if (faculty.domainTags?.length) {
    casKeyValue(doc, 'Areas of Specialisation', faculty.domainTags.join('; '));
  }

  // 2. Academic qualifications
  casSectionHeader(doc, '2', 'Academic Qualifications');
  casTable(
    doc,
    [
      { header: 'Degree', key: 'degree', flex: 1 },
      { header: 'Field / Specialisation', key: 'field', flex: 1.3 },
      { header: 'University / Institution', key: 'institution', flex: 1.6 },
      { header: 'Year', key: 'year', flex: 0.5 },
    ],
    (faculty.education || []).map(e => ({
      degree: e.degree || '—',
      field: e.field || '—',
      institution: e.institution || '—',
      year: e.year != null ? String(e.year) : '—',
    })),
  );

  // 3. Positions held
  casSectionHeader(doc, '3', 'Positions Held');
  casTable(
    doc,
    [
      { header: 'Institution', key: 'institution', flex: 1.6 },
      { header: 'Designation', key: 'designation', flex: 1.2 },
      { header: 'Period', key: 'period', flex: 0.9 },
    ],
    (faculty.employmentHistory || []).map(e => ({
      institution: e.institution,
      designation: e.designation || '—',
      period: fmtYearRange(e.from, e.to, e.current),
    })),
  );

  // 4. Publications
  casSectionHeader(doc, '4', 'Research Publications (Peer-Reviewed / UGC-Listed)');
  const pubLines = publications.map(p => {
    const authors = p.authors?.length
      ? p.authors.length > 6
        ? `${p.authors.slice(0, 6).join(', ')} et al.`
        : p.authors.join(', ')
      : '';
    const bits = [];
    if (authors) bits.push(authors);
    if (p.year) bits.push(`(${p.year})`);
    bits.push(`"${p.title}"`);
    if (p.venue) bits.push(p.venue);
    if (p.doi) bits.push(`DOI: ${p.doi}`);
    return bits.join(' ');
  });
  casNumberedList(doc, pubLines);

  // 5. Books & chapters
  casSectionHeader(doc, '5', 'Books & Book Chapters');
  const bookLines = [];
  if (manual.booksInternational)
    bookLines.push(`Books authored — International publisher: ${manual.booksInternational}`);
  if (manual.booksNational)
    bookLines.push(`Books authored — National publisher: ${manual.booksNational}`);
  if (manual.chaptersInternational)
    bookLines.push(`Book chapters — International: ${manual.chaptersInternational}`);
  if (manual.chaptersNational)
    bookLines.push(`Book chapters — National: ${manual.chaptersNational}`);
  if (manual.editorInternational)
    bookLines.push(`Editor — International volume: ${manual.editorInternational}`);
  if (manual.editorNational)
    bookLines.push(`Editor — National volume: ${manual.editorNational}`);
  casNumberedList(doc, bookLines);

  // 6. Sponsored research projects
  casSectionHeader(doc, '6', 'Sponsored Research Projects');
  casTable(
    doc,
    [
      { header: 'Title', key: 'title', flex: 2 },
      { header: 'Funding Agency', key: 'agency', flex: 1 },
      { header: 'Role', key: 'role', flex: 0.6 },
      { header: 'Amount', key: 'amount', flex: 0.9 },
      { header: 'Status', key: 'status', flex: 0.7 },
    ],
    (faculty.grantsReceived || []).map(g => ({
      title: g.title,
      agency: g.agency || '—',
      role: g.role || 'PI',
      amount: fmtInr(g.amount),
      status: g.ongoing ? 'Ongoing' : g.year ? String(g.year) : 'Completed',
    })),
  );

  // 7. Consultancy
  casSectionHeader(doc, '7', 'Consultancy Activities');
  const fullW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  if (manual.consultancyLakhs && manual.consultancyLakhs > 0) {
    doc
      .fillColor(CAS_COLORS.ink)
      .font('Helvetica')
      .fontSize(10)
      .text(
        `Total consultancy earnings on record: Rs. ${manual.consultancyLakhs} lakh.`,
        doc.page.margins.left,
        doc.y,
        { width: fullW },
      );
  } else {
    doc
      .fillColor(CAS_COLORS.muted)
      .font('Helvetica-Oblique')
      .fontSize(10)
      .text('(No records on file.)', doc.page.margins.left, doc.y, { width: fullW });
  }

  // 8. PhD / M.Phil guidance
  casSectionHeader(doc, '8', 'Ph.D. / M.Phil. Research Guidance');
  const guidanceRows = [];
  if (manual.phdAwarded)
    guidanceRows.push({ level: 'Ph.D.', status: 'Awarded', count: manual.phdAwarded });
  if (manual.phdOngoing)
    guidanceRows.push({ level: 'Ph.D.', status: 'Ongoing (registered)', count: manual.phdOngoing });
  if (manual.mPhilAwarded)
    guidanceRows.push({ level: 'M.Phil.', status: 'Awarded', count: manual.mPhilAwarded });
  casTable(
    doc,
    [
      { header: 'Level', key: 'level', flex: 1 },
      { header: 'Status', key: 'status', flex: 2 },
      { header: 'Count', key: 'count', flex: 0.6 },
    ],
    guidanceRows.map(r => ({ ...r, count: String(r.count) })),
  );

  // 9. Awards
  casSectionHeader(doc, '9', 'Awards & Fellowships');
  casNumberedList(
    doc,
    (faculty.awards || []).map(a => {
      const bits = [a.title];
      if (a.year) bits.push(`(${a.year})`);
      if (a.description) bits.push(`— ${a.description}`);
      return bits.join(' ');
    }),
  );

  // 10. Invited lectures / conferences
  casSectionHeader(doc, '10', 'Conferences / Seminars / Invited Lectures');
  const lectureLines = [];
  if (manual.invitedLecturesIntlAbroad)
    lectureLines.push(`International (abroad): ${manual.invitedLecturesIntlAbroad}`);
  if (manual.invitedLecturesIntlInIndia)
    lectureLines.push(`International (in India): ${manual.invitedLecturesIntlInIndia}`);
  if (manual.invitedLecturesNational)
    lectureLines.push(`National: ${manual.invitedLecturesNational}`);
  if (manual.invitedLecturesState)
    lectureLines.push(`State / University: ${manual.invitedLecturesState}`);
  casNumberedList(doc, lectureLines);

  // 11. Research metrics summary — surface the citation-derived numbers
  // AICTE self-disclosure lists (h-index, citations, publications).
  casSectionHeader(doc, '11', 'Research Impact Metrics');
  casTable(
    doc,
    [
      { header: 'Metric', key: 'metric', flex: 2 },
      { header: 'Value', key: 'value', flex: 1 },
    ],
    [
      { metric: 'Total peer-reviewed publications on file', value: String(publications.length) },
      { metric: 'Citations (as per Scopus / ORCID sync)', value: String(faculty.citationCount || 0) },
      { metric: 'h-index', value: String(faculty.hIndex || 0) },
      { metric: 'i10-index', value: String(faculty.i10Index || 0) },
    ],
  );

  // 12. Declaration + signature
  casSectionHeader(doc, '12', 'Declaration');
  const declW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc
    .fillColor(CAS_COLORS.ink)
    .font('Helvetica')
    .fontSize(10)
    .text(
      'I certify that the information furnished above is true and correct to the best of my ' +
        'knowledge. I understand that any incorrect information may lead to action per the ' +
        'AICTE Approval Process regulations and the institution\'s service rules.',
      doc.page.margins.left,
      doc.y,
      { width: declW, align: 'justify' },
    );
  casSignatureBlock(doc);

  doc.moveDown(2);
  const generatedAt = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const footerW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc
    .fillColor(CAS_COLORS.muted)
    .font('Helvetica-Oblique')
    .fontSize(8)
    .text(
      `Generated by FacultyConnect · ${generatedAt} · AICTE Approval Process proforma layout. ` +
        'This is a self-disclosure format — the institution\'s AICTE compliance officer may ' +
        'require additional supporting documents at submission.',
      doc.page.margins.left,
      doc.y,
      { width: footerW, align: 'center' },
    );

  doc.end();
  const buffer = await finished;

  logger.info('aicte cv rendered', {
    facultyId,
    bytes: buffer.length,
    publications: publications.length,
  });
  return {
    buffer,
    filename: `aicte-cv-${safeFilename(faculty.name)}.pdf`,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// NIRF Faculty CV template
// ─────────────────────────────────────────────────────────────────────────
//
// Modelled on the NIRF (National Institutional Ranking Framework)
// faculty data submission format used by MHRD's ranking exercise. NIRF's
// per-faculty card is very compact — it's a summary sheet meant to
// aggregate at the institution level rather than a full CV, so we render
// it as a single-page density-optimised summary with big tables and
// numeric rollups.

export async function renderNirfCv(facultyId) {
  const faculty = await Faculty.findById(facultyId).populate(
    'institutionId',
    'name domain verificationStatus',
  );
  if (!faculty) {
    const err = new Error('Faculty not found');
    err.code = 'FACULTY_NOT_FOUND';
    err.status = 404;
    throw err;
  }
  const publications = await Publication.find({ facultyId }).sort({ year: -1, createdAt: -1 });
  const manual = faculty.casManualInputs || {};

  // Derive NIRF-relevant aggregates. NIRF cares about:
  // - Publications broken down by indexer (SCI / Scopus / WoS) — we don't
  //   store per-paper indexer yet, so treat all as "peer-reviewed" and
  //   note the caveat in the footnote.
  // - Sponsored funding: sum of grantsReceived amounts (in lakh Rs).
  // - PhD guided: awarded + ongoing counts.
  // - Faculty experience years: current year minus earliest employment
  //   from year.
  const grantFundingLakhs =
    (faculty.grantsReceived || [])
      .reduce((s, g) => s + (g.amount || 0), 0) / 100_000;
  const earliestFrom = (faculty.employmentHistory || [])
    .map(e => e.from)
    .filter(y => Number.isFinite(y))
    .reduce((min, y) => (min == null ? y : Math.min(min, y)), null);
  const experienceYears = earliestFrom ? new Date().getFullYear() - earliestFrom : null;
  const highest = (faculty.education || [])[0] || null;

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));
  const finished = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  // Header
  const titleW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc
    .fillColor(CAS_COLORS.ink)
    .font('Helvetica-Bold')
    .fontSize(14)
    .text('NIRF FACULTY DATA CARD', doc.page.margins.left, doc.y, {
      width: titleW,
      align: 'center',
      characterSpacing: 0.5,
    });
  doc
    .fillColor(CAS_COLORS.muted)
    .font('Helvetica')
    .fontSize(10)
    .text(
      'National Institutional Ranking Framework — per-faculty summary',
      doc.page.margins.left,
      doc.y,
      { width: titleW, align: 'center' },
    );
  doc.moveDown(0.4);
  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .lineWidth(1)
    .strokeColor(CAS_COLORS.ink)
    .stroke();
  doc.moveDown(0.6);

  // A. Faculty identification
  casSectionHeader(doc, 'A', 'Faculty Identification');
  casKeyValue(doc, 'Name', faculty.name);
  casKeyValue(
    doc,
    'Designation',
    faculty.designation === 'Professor'
      ? 'Professor'
      : `${faculty.designation || ''} Professor`,
  );
  casKeyValue(doc, 'Department', faculty.department);
  casKeyValue(doc, 'Institution', faculty.institutionId?.name);
  casKeyValue(doc, 'Nature of Association', 'Regular (per institutional records)');
  casKeyValue(
    doc,
    'Date of Joining (Institution)',
    earliestFrom ? `Year ${earliestFrom}` : 'Not on file',
  );
  casKeyValue(doc, 'Ph.D. Status', highest?.degree?.toUpperCase().includes('PH') ? 'Yes' : 'To confirm');

  // B. Highest qualification — NIRF asks for a single top-degree row
  casSectionHeader(doc, 'B', 'Highest Qualification');
  casTable(
    doc,
    [
      { header: 'Degree', key: 'degree', flex: 1 },
      { header: 'Field / Specialisation', key: 'field', flex: 1.5 },
      { header: 'University', key: 'university', flex: 1.8 },
      { header: 'Year', key: 'year', flex: 0.6 },
    ],
    highest
      ? [
          {
            degree: highest.degree,
            field: highest.field || '—',
            university: highest.institution || '—',
            year: highest.year ? String(highest.year) : '—',
          },
        ]
      : [],
  );

  // C. Experience — NIRF splits into academic vs industry. We can't
  // distinguish reliably from the employment records we hold, so we
  // report the total and flag the split as manually-verifiable.
  casSectionHeader(doc, 'C', 'Professional Experience');
  casTable(
    doc,
    [
      { header: 'Metric', key: 'metric', flex: 2 },
      { header: 'Value', key: 'value', flex: 1 },
    ],
    [
      {
        metric: 'Total experience (from earliest position)',
        value: experienceYears != null ? `${experienceYears} years` : 'Not on file',
      },
      {
        metric: 'Positions held (all institutions)',
        value: String((faculty.employmentHistory || []).length),
      },
    ],
  );

  // D. Research output — the main NIRF submission block
  casSectionHeader(doc, 'D', 'Research Output');
  casTable(
    doc,
    [
      { header: 'Metric', key: 'metric', flex: 2 },
      { header: 'Value', key: 'value', flex: 1 },
    ],
    [
      { metric: 'Total peer-reviewed publications on file', value: String(publications.length) },
      { metric: 'Citations (Scopus / ORCID rolled up)', value: String(faculty.citationCount || 0) },
      { metric: 'h-index', value: String(faculty.hIndex || 0) },
      { metric: 'i10-index', value: String(faculty.i10Index || 0) },
      {
        metric: 'Books authored (International + National)',
        value: String((manual.booksInternational || 0) + (manual.booksNational || 0)),
      },
      {
        metric: 'Book chapters (International + National)',
        value: String((manual.chaptersInternational || 0) + (manual.chaptersNational || 0)),
      },
    ],
  );

  // E. Sponsored research + consultancy
  casSectionHeader(doc, 'E', 'Sponsored Research & Consultancy');
  casTable(
    doc,
    [
      { header: 'Metric', key: 'metric', flex: 2 },
      { header: 'Value', key: 'value', flex: 1 },
    ],
    [
      { metric: 'Sponsored projects — count', value: String((faculty.grantsReceived || []).length) },
      {
        metric: 'Total funding brought in',
        value: grantFundingLakhs > 0
          ? `Rs. ${grantFundingLakhs.toFixed(2)} lakh`
          : 'Rs. 0',
      },
      {
        metric: 'Consultancy earnings on record',
        value: manual.consultancyLakhs > 0
          ? `Rs. ${manual.consultancyLakhs} lakh`
          : 'Rs. 0',
      },
    ],
  );

  // F. Research guidance — PhD supervision is a NIRF ranking component
  casSectionHeader(doc, 'F', 'Ph.D. Guidance');
  casTable(
    doc,
    [
      { header: 'Status', key: 'status', flex: 2 },
      { header: 'Count', key: 'count', flex: 1 },
    ],
    [
      { status: 'Ph.D. awarded', count: String(manual.phdAwarded || 0) },
      { status: 'Ph.D. ongoing (registered)', count: String(manual.phdOngoing || 0) },
      { status: 'M.Phil. awarded', count: String(manual.mPhilAwarded || 0) },
    ],
  );

  // G. Recognition
  casSectionHeader(doc, 'G', 'Awards & Recognition');
  casTable(
    doc,
    [
      { header: 'Metric', key: 'metric', flex: 2 },
      { header: 'Value', key: 'value', flex: 1 },
    ],
    [
      { metric: 'Awards / fellowships on file', value: String((faculty.awards || []).length) },
      {
        metric: 'Invited lectures (all tiers)',
        value: String(
          (manual.invitedLecturesIntlAbroad || 0) +
            (manual.invitedLecturesIntlInIndia || 0) +
            (manual.invitedLecturesNational || 0) +
            (manual.invitedLecturesState || 0),
        ),
      },
    ],
  );

  // Declaration
  casSectionHeader(doc, 'H', 'Declaration');
  const declW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc
    .fillColor(CAS_COLORS.ink)
    .font('Helvetica')
    .fontSize(10)
    .text(
      'I confirm that the information furnished above is true and matches the records the ' +
        'institution submits to NIRF. Where a metric is derived from an external source ' +
        '(Scopus / ORCID / WoS), the source is noted in the metric label.',
      doc.page.margins.left,
      doc.y,
      { width: declW, align: 'justify' },
    );
  casSignatureBlock(doc);

  doc.moveDown(2);
  const generatedAt = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const footerW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc
    .fillColor(CAS_COLORS.muted)
    .font('Helvetica-Oblique')
    .fontSize(8)
    .text(
      `Generated by FacultyConnect · ${generatedAt} · NIRF faculty data card. ` +
        'NIRF submissions are made by the institution — this per-faculty summary is a ' +
        'reconciliation aid, not the final submission.',
      doc.page.margins.left,
      doc.y,
      { width: footerW, align: 'center' },
    );

  doc.end();
  const buffer = await finished;

  logger.info('nirf cv rendered', {
    facultyId,
    bytes: buffer.length,
    publications: publications.length,
    grantFundingLakhs,
  });
  return {
    buffer,
    filename: `nirf-cv-${safeFilename(faculty.name)}.pdf`,
  };
}
