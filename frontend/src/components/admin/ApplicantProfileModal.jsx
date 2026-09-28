import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  X,
  Mail,
  Phone,
  Building2,
  BadgeCheck,
  Quote,
  TrendingUp,
  Award,
  FileText,
  GraduationCap,
  IndianRupee,
  Download,
  Loader2,
  ExternalLink,
  Star,
  Trash2,
  Save,
} from 'lucide-react';
import { Alert, AlertDescription } from '../ui/Alert';
import { Button } from '../ui/Button';
import {
  getApplicantProfile,
  downloadApplicantCv,
  saveApplicantReview,
} from '../../services/job.service';

// CV templates available server-side (see backend/services/cv.service.js).
// Labels stay short so the dropdown doesn't wrap; the tooltip / description
// column tells the admin when to pick each one.
const CV_TEMPLATES = [
  { value: 'generic', label: 'Generic CV', hint: 'Branded FacultyConnect layout' },
  { value: 'ugc_cas9', label: 'UGC CAS-9', hint: 'For CAS promotion committees' },
  { value: 'aicte', label: 'AICTE', hint: 'AICTE Approval Process proforma' },
  { value: 'nirf', label: 'NIRF', hint: 'NIRF faculty data card' },
];

function initialsOf(name) {
  return (name || 'F')
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w.replace(/[^A-Za-z]/g, '')[0])
    .filter(Boolean)
    .join('')
    .toUpperCase();
}

function designationLabel(d) {
  if (!d) return 'Faculty';
  if (d === 'Professor') return 'Professor';
  return `${d} Professor`;
}

function formatAmount(amount) {
  if (typeof amount !== 'number' || amount <= 0) return '';
  if (amount >= 10_000_000) return `Rs. ${(amount / 10_000_000).toFixed(2)} Cr`;
  if (amount >= 100_000) return `Rs. ${(amount / 100_000).toFixed(2)} L`;
  return `Rs. ${amount.toLocaleString('en-IN')}`;
}

function displayRange(from, to, current) {
  if (!from && !to && !current) return '';
  const start = from || '?';
  const end = current ? 'Present' : to || '?';
  return `${start} – ${end}`;
}

function SectionHeading({ children }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-widest text-text-muted mt-6 mb-2">
      {children}
    </h3>
  );
}

function StatTile({ icon, value, label, muted }) {
  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <div className="flex items-center justify-between">
        <div className="text-text-muted">{icon}</div>
        <div className={`text-lg font-extrabold ${muted ? 'text-text-muted' : 'text-secondary'} tabular-nums`}>
          {value}
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-wider text-text-muted mt-1 font-semibold">
        {label}
      </div>
    </div>
  );
}

/**
 * Slide-over drawer showing an applicant's full profile from the
 * kanban card. Loads on mount, shows skeleton while fetching, renders
 * the same content shape as PublicProfile but with contact info
 * (applicants opt-in by applying).
 *
 * Footer holds the CV export controls: template dropdown + download
 * button. The dropdown defaults to `generic` — the compliance-specific
 * templates (CAS-9 / AICTE / NIRF) are opt-in because they're rendered
 * from data the applicant hasn't necessarily filled in yet.
 */
export default function ApplicantProfileModal({ jobId, applicationId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingTemplate, setDownloadingTemplate] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('generic');
  const [downloadError, setDownloadError] = useState('');
  // Review form state — shared notes + this reviewer's rating/comment.
  // Initialised from the profile payload once it loads; edits live in
  // local state until Save posts them back to the server.
  const [notesDraft, setNotesDraft] = useState('');
  const [ratingDraft, setRatingDraft] = useState(0);
  const [commentDraft, setCommentDraft] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSaved, setReviewSaved] = useState(false);

  useEffect(() => {
    if (!jobId || !applicationId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    getApplicantProfile(jobId, applicationId)
      .then(data => {
        if (!cancelled) {
          setProfile(data);
          setNotesDraft(data.application?.notes || '');
          setRatingDraft(data.application?.myScorecard?.rating || 0);
          setCommentDraft(data.application?.myScorecard?.comment || '');
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.response?.data?.error?.message || 'Failed to load applicant profile');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId, applicationId]);

  // Esc closes. Register once per open lifecycle so we don't leak.
  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onDownload = async () => {
    setDownloadingTemplate(selectedTemplate);
    setDownloadError('');
    try {
      await downloadApplicantCv(jobId, applicationId, selectedTemplate);
    } catch (err) {
      setDownloadError(err.response?.data?.error?.message || 'CV download failed');
    } finally {
      setDownloadingTemplate('');
    }
  };

  // Merge the fresh application payload back into the loaded profile so
  // the UI reflects new scorecards / average without a full refetch.
  const mergeReviewResponse = updatedApp => {
    setProfile(prev =>
      prev
        ? {
            ...prev,
            application: {
              ...prev.application,
              notes: updatedApp.notes || '',
              scorecards: updatedApp.scorecards || [],
              ratingCount: updatedApp.ratingCount ?? 0,
              averageRating: updatedApp.averageRating ?? null,
              myScorecard:
                (updatedApp.scorecards || []).find(
                  sc => sc.reviewerId === prev.currentReviewerId,
                ) || null,
            },
          }
        : prev,
    );
  };

  const onSaveReview = async () => {
    if (savingReview) return;
    setSavingReview(true);
    setReviewError('');
    setReviewSaved(false);
    try {
      const payload = {};
      const notesTrimmed = notesDraft.trim();
      const priorNotes = (profile.application?.notes || '').trim();
      if (notesTrimmed !== priorNotes) payload.notes = notesTrimmed;
      if (ratingDraft > 0) {
        payload.rating = ratingDraft;
        if ((commentDraft || '').trim() !== (profile.application?.myScorecard?.comment || '').trim()) {
          payload.comment = commentDraft.trim();
        }
      }
      if (Object.keys(payload).length === 0) {
        setReviewError('Nothing to save.');
        setSavingReview(false);
        return;
      }
      const updated = await saveApplicantReview(jobId, applicationId, payload);
      const myFresh = (updated.scorecards || []).find(
        sc => sc.reviewerId === profile.currentReviewerId,
      );
      // Reset drafts to server truth so subsequent edits diff cleanly.
      setNotesDraft(updated.notes || '');
      setRatingDraft(myFresh?.rating || 0);
      setCommentDraft(myFresh?.comment || '');
      mergeReviewResponse(updated);
      setReviewSaved(true);
      // Auto-clear the "saved" toast after 2s so it doesn't linger.
      setTimeout(() => setReviewSaved(false), 2000);
    } catch (err) {
      setReviewError(err.response?.data?.error?.message || 'Could not save review.');
    } finally {
      setSavingReview(false);
    }
  };

  const onRemoveMyScorecard = async () => {
    if (savingReview) return;
    setSavingReview(true);
    setReviewError('');
    try {
      const updated = await saveApplicantReview(jobId, applicationId, { removeMyScorecard: true });
      setRatingDraft(0);
      setCommentDraft('');
      mergeReviewResponse(updated);
    } catch (err) {
      setReviewError(err.response?.data?.error?.message || 'Could not remove your scorecard.');
    } finally {
      setSavingReview(false);
    }
  };

  const inst = profile?.institution;

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/40"
      />
      <motion.aside
        key="drawer"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 260 }}
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-2xl bg-white shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="applicant-profile-title"
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="min-w-0 flex-1">
            <div id="applicant-profile-title" className="text-sm font-bold text-secondary">
              Applicant profile
            </div>
            <div className="text-xs text-text-muted">
              Contact details visible — this candidate applied to your posting.
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close profile"
            className="p-1.5 rounded-md text-text-muted hover:text-text-light hover:bg-muted transition-colors"
          >
            <X size={18} />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-text-muted">
              <Loader2 size={20} className="animate-spin mr-2" /> Loading profile…
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : profile ? (
            <>
              {/* Identity */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary to-secondary text-white text-lg font-extrabold flex items-center justify-center shrink-0">
                  {initialsOf(profile.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold text-text-light leading-tight">
                    {profile.name}
                  </h2>
                  <div className="text-sm text-text-muted mt-1 flex items-center gap-2 flex-wrap">
                    <span>{designationLabel(profile.designation)}</span>
                    {profile.department && (
                      <>
                        <span className="opacity-60">·</span>
                        <span>{profile.department}</span>
                      </>
                    )}
                    {inst?.name && (
                      <>
                        <span className="opacity-60">·</span>
                        <span className="inline-flex items-center gap-1">
                          <Building2 size={12} /> {inst.name}
                        </span>
                        {inst.verificationStatus === 'verified' && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-success/10 text-success border border-success/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                            <BadgeCheck size={10} /> Verified
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-3 flex-wrap text-xs">
                    {profile.email && (
                      <a
                        href={`mailto:${profile.email}`}
                        className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline"
                      >
                        <Mail size={12} /> {profile.email}
                      </a>
                    )}
                    {profile.phone && (
                      <a
                        href={`tel:${profile.phone}`}
                        className="inline-flex items-center gap-1.5 text-text-muted hover:text-text-light"
                      >
                        <Phone size={12} /> {profile.phone}
                      </a>
                    )}
                    {profile.orcidId && (
                      <a
                        href={`https://orcid.org/${profile.orcidId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-text-muted hover:text-primary"
                      >
                        ORCID {profile.orcidId} <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Metrics */}
              {(() => {
                const unreconciled =
                  profile.publicationCount === 0 &&
                  (profile.citationCount || profile.hIndex || profile.i10Index);
                const val = raw => (unreconciled ? '—' : (raw ?? 0));
                return (
                  <div className="grid grid-cols-4 gap-2 mt-5">
                    <StatTile
                      icon={<Quote size={14} />}
                      value={val(profile.citationCount)}
                      label="Citations"
                      muted={unreconciled}
                    />
                    <StatTile
                      icon={<TrendingUp size={14} />}
                      value={val(profile.hIndex)}
                      label="h-index"
                      muted={unreconciled}
                    />
                    <StatTile
                      icon={<Award size={14} />}
                      value={val(profile.i10Index)}
                      label="i10-index"
                      muted={unreconciled}
                    />
                    <StatTile
                      icon={<FileText size={14} />}
                      value={profile.publicationCount ?? 0}
                      label="Publications"
                    />
                  </div>
                );
              })()}

              {/* Review — shared notes + this reviewer's scorecard.
                  Placed above the profile content so it's the first
                  thing an admin sees when they open the drawer. */}
              <SectionHeading>Committee review</SectionHeading>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                {reviewError && (
                  <Alert variant="destructive">
                    <AlertDescription>{reviewError}</AlertDescription>
                  </Alert>
                )}
                {reviewSaved && (
                  <div className="text-xs text-success font-semibold">Saved.</div>
                )}
                {/* Aggregate rating strip */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <span className="font-semibold text-text-light">
                      Committee rating:
                    </span>
                    {profile.application?.ratingCount > 0 ? (
                      <>
                        <span className="font-bold text-primary tabular-nums">
                          {profile.application.averageRating?.toFixed(1)} / 5
                        </span>
                        <span>({profile.application.ratingCount} reviewer{profile.application.ratingCount === 1 ? '' : 's'})</span>
                      </>
                    ) : (
                      <span className="italic">No ratings yet</span>
                    )}
                  </div>
                </div>

                {/* Star rating input for this reviewer */}
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mb-1.5">
                    Your rating
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRatingDraft(n === ratingDraft ? 0 : n)}
                        disabled={savingReview}
                        aria-label={`Set rating to ${n} out of 5`}
                        className="p-0.5 transition-transform hover:scale-110 disabled:opacity-60"
                      >
                        <Star
                          size={22}
                          className={
                            n <= ratingDraft
                              ? 'fill-yellow-400 text-yellow-500'
                              : 'text-text-muted'
                          }
                        />
                      </button>
                    ))}
                    {ratingDraft > 0 && (
                      <span className="ml-2 text-xs text-text-muted">
                        {ratingDraft} / 5
                      </span>
                    )}
                  </div>
                </div>

                {/* This reviewer's comment */}
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mb-1.5">
                    Your comment <span className="opacity-70">(optional)</span>
                  </div>
                  <textarea
                    rows={2}
                    value={commentDraft}
                    onChange={e => setCommentDraft(e.target.value)}
                    disabled={savingReview}
                    placeholder="Strengths, gaps, questions for interview…"
                    className="w-full text-sm rounded-md border border-border bg-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Shared notes — visible/editable by all reviewers */}
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mb-1.5">
                    Shared notes <span className="opacity-70">(all reviewers see this)</span>
                  </div>
                  <textarea
                    rows={2}
                    value={notesDraft}
                    onChange={e => setNotesDraft(e.target.value)}
                    disabled={savingReview}
                    placeholder="Committee-level notes about this applicant…"
                    className="w-full text-sm rounded-md border border-border bg-white px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                  {profile.application?.myScorecard && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onRemoveMyScorecard}
                      disabled={savingReview}
                      className="border-danger/40 text-danger hover:bg-danger/5"
                    >
                      <Trash2 size={12} className="mr-1" /> Remove my rating
                    </Button>
                  )}
                  <div className="flex-1" />
                  <Button
                    type="button"
                    size="sm"
                    onClick={onSaveReview}
                    disabled={savingReview}
                  >
                    {savingReview ? (
                      <>
                        <Loader2 size={12} className="mr-1 animate-spin" /> Saving…
                      </>
                    ) : (
                      <>
                        <Save size={12} className="mr-1" /> Save review
                      </>
                    )}
                  </Button>
                </div>

                {/* Other reviewers' scorecards */}
                {profile.application?.scorecards?.length > 0 && (
                  <div className="pt-2 border-t border-primary/15">
                    <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mb-2">
                      All ratings
                    </div>
                    <ul className="space-y-2">
                      {profile.application.scorecards.map(sc => (
                        <li key={sc.id} className="text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-text-light">
                              {sc.reviewerName || 'Reviewer'}
                            </span>
                            <span className="inline-flex items-center gap-0.5 text-yellow-600 font-semibold tabular-nums">
                              <Star size={11} className="fill-yellow-400 text-yellow-500" />
                              {sc.rating}/5
                            </span>
                            <span className="text-text-muted">
                              · {new Date(sc.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                          {sc.comment && (
                            <p className="text-text-muted mt-0.5 pl-3 border-l border-border leading-relaxed">
                              {sc.comment}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Bio */}
              {profile.bio && (
                <>
                  <SectionHeading>Bio</SectionHeading>
                  <p className="text-sm text-text-light leading-relaxed whitespace-pre-line">
                    {profile.bio}
                  </p>
                </>
              )}

              {/* Research areas */}
              {profile.domainTags?.length > 0 && (
                <>
                  <SectionHeading>Research areas</SectionHeading>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.domainTags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {/* Employment */}
              {profile.employmentHistory?.length > 0 && (
                <>
                  <SectionHeading>Employment history</SectionHeading>
                  <ol className="space-y-3">
                    {[...profile.employmentHistory]
                      .sort((a, b) => {
                        if (a.current && !b.current) return -1;
                        if (!a.current && b.current) return 1;
                        return (b.to || 9999) - (a.to || 9999);
                      })
                      .map(it => (
                        <li key={it.id} className="pl-3 border-l-2 border-primary/30">
                          <div className="text-sm font-bold text-text-light">
                            {it.designation || 'Faculty'}
                          </div>
                          <div className="text-sm text-text-light">{it.institution}</div>
                          <div className="text-xs text-text-muted mt-0.5">
                            {displayRange(it.from, it.to, it.current)}
                            {it.current && (
                              <span className="ml-2 text-success font-semibold">Current</span>
                            )}
                          </div>
                          {it.description && (
                            <p className="text-xs text-text-muted mt-1 leading-relaxed">
                              {it.description}
                            </p>
                          )}
                        </li>
                      ))}
                  </ol>
                </>
              )}

              {/* Education */}
              {profile.education?.length > 0 && (
                <>
                  <SectionHeading>Education</SectionHeading>
                  <ul className="space-y-2">
                    {[...profile.education]
                      .sort((a, b) => (b.year || 0) - (a.year || 0))
                      .map(it => (
                        <li key={it.id} className="flex items-start gap-2.5">
                          <GraduationCap size={16} className="text-primary shrink-0 mt-0.5" />
                          <div>
                            <div className="text-sm font-semibold text-text-light">
                              {it.degree}
                              {it.field ? ` in ${it.field}` : ''}
                            </div>
                            <div className="text-xs text-text-muted">
                              {it.institution}
                              {it.institution && it.year ? ' · ' : ''}
                              {it.year || ''}
                            </div>
                          </div>
                        </li>
                      ))}
                  </ul>
                </>
              )}

              {/* Awards */}
              {profile.awards?.length > 0 && (
                <>
                  <SectionHeading>Awards & recognitions</SectionHeading>
                  <ul className="space-y-2">
                    {[...profile.awards]
                      .sort((a, b) => (b.year || 0) - (a.year || 0))
                      .map(it => (
                        <li key={it.id} className="flex items-start gap-2.5">
                          <Award size={16} className="text-secondary shrink-0 mt-0.5" />
                          <div>
                            <div className="text-sm font-semibold text-text-light">{it.title}</div>
                            {it.year && (
                              <div className="text-xs text-text-muted">{it.year}</div>
                            )}
                            {it.description && (
                              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                                {it.description}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                  </ul>
                </>
              )}

              {/* Grants */}
              {profile.grantsReceived?.length > 0 && (
                <>
                  <SectionHeading>Grants received</SectionHeading>
                  <ul className="space-y-2">
                    {[...profile.grantsReceived]
                      .sort((a, b) => (b.year || 0) - (a.year || 0))
                      .map(it => (
                        <li
                          key={it.id}
                          className="rounded-md border border-border bg-white p-3 flex items-start justify-between gap-3 flex-wrap"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-text-light">
                              {it.title}
                            </div>
                            <div className="text-xs text-text-muted mt-0.5">
                              {[it.agency, it.year, it.ongoing && 'Ongoing']
                                .filter(Boolean)
                                .join(' · ')}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="inline-flex items-center rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase">
                              {it.role}
                            </span>
                            {typeof it.amount === 'number' && it.amount > 0 && (
                              <div className="text-xs font-semibold text-text-light mt-1 inline-flex items-center gap-0.5">
                                <IndianRupee size={10} />
                                {formatAmount(it.amount).replace(/^Rs\.\s?/, '')}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                  </ul>
                </>
              )}

              {/* Publications */}
              <SectionHeading>
                Publications ({profile.publicationCount ?? 0})
              </SectionHeading>
              {profile.publications?.length === 0 ? (
                <p className="text-sm text-text-muted italic">No publications on file.</p>
              ) : (
                <div className="divide-y divide-border">
                  {profile.publications?.map(pub => (
                    <div key={pub.id} className="py-3">
                      <div className="text-sm font-semibold text-text-light">{pub.title}</div>
                      {pub.authors?.length > 0 && (
                        <div className="text-xs text-text-muted mt-0.5">
                          {pub.authors.slice(0, 6).join(', ')}
                          {pub.authors.length > 6 ? ` +${pub.authors.length - 6} more` : ''}
                        </div>
                      )}
                      <div className="text-xs text-text-muted mt-0.5">
                        {pub.venue && <span className="italic">{pub.venue}</span>}
                        {pub.venue && pub.year ? ' · ' : ''}
                        {pub.year || ''}
                      </div>
                      {(pub.citationCount > 0 || pub.doi) && (
                        <div className="mt-1 flex items-center gap-3 text-[11px] text-text-muted flex-wrap">
                          {pub.citationCount > 0 && (
                            <span>
                              Cited by <span className="font-semibold text-text-light">{pub.citationCount}</span>
                            </span>
                          )}
                          {pub.doi && (
                            <a
                              href={`https://doi.org/${pub.doi}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline"
                            >
                              DOI {pub.doi}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer — CV export */}
        {profile && !loading && !error && (
          <footer className="border-t border-border px-5 py-3 shrink-0 space-y-2 bg-muted/30">
            {downloadError && (
              <Alert variant="destructive">
                <AlertDescription>{downloadError}</AlertDescription>
              </Alert>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-xs text-text-muted font-semibold shrink-0">CV format:</div>
              <select
                value={selectedTemplate}
                onChange={e => setSelectedTemplate(e.target.value)}
                disabled={Boolean(downloadingTemplate)}
                className="text-xs rounded-md border border-border bg-white px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary flex-1 min-w-[140px]"
              >
                {CV_TEMPLATES.map(t => (
                  <option key={t.value} value={t.value} title={t.hint}>
                    {t.label} — {t.hint}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={onDownload}
                disabled={Boolean(downloadingTemplate)}
                className="shrink-0"
              >
                {downloadingTemplate ? (
                  <>
                    <Loader2 size={14} className="mr-1.5 animate-spin" /> Preparing…
                  </>
                ) : (
                  <>
                    <Download size={14} className="mr-1.5" /> Download CV
                  </>
                )}
              </Button>
            </div>
          </footer>
        )}
      </motion.aside>
    </AnimatePresence>
  );
}
