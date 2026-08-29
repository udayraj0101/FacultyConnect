import PDFDocument from 'pdfkit';
import { Faculty } from '../models/Faculty.js';
import { Publication } from '../models/Publication.js';
import { createLogger } from '../utils/logger.js';

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
