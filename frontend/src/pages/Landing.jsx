import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  GraduationCap,
  Building2,
  ShieldCheck,
  BadgeCheck,
  Search,
  FileText,
  Briefcase,
  KanbanSquare,
  Zap,
  Users,
  Check,
  ChevronRight,
  Shield,
  BookOpen,
  Link2,
  FileCheck2,
  Compass,
} from 'lucide-react';

const fade = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } };

const STATS = [
  { n: '1-click', label: 'ORCID Import' },
  { n: 'UGC-CARE', label: 'Verified Journals' },
  { n: 'Zero', label: 'Content Feed Noise' },
  { n: '100%', label: 'DPDP-Act Compliant' },
];

const PORTALS = [
  {
    id: 'faculty',
    emoji: '🎓',
    label: 'Faculty Member',
    color: '#6C5CE7',
    badge: 'Personal Academic Cockpit',
    title: 'Your academic profile that builds itself.',
    description:
      'One ORCID connection pulls your publications, citations, employment, and metrics — no rework. Discover UGC-CARE-verified journals, apply to jobs with one click, and export a polished CV whenever you need it.',
    stats: [
      { v: '4', l: 'Data sources auto-synced' },
      { v: '1-click', l: 'Job apply with profile' },
    ],
    features: [
      'ORCID / Scopus / Crossref / Scholar CSV import',
      'Auto h-index & i10 computation',
      'UGC-CARE / Scopus verified opportunities',
      'Instant CV PDF export from your data',
    ],
  },
  {
    id: 'college',
    emoji: '🏛',
    label: 'College Admin',
    color: '#00B894',
    badge: 'Institutional Recruiting Hub',
    title: 'Post openings, review applicants, run your pipeline.',
    description:
      'Publish faculty openings that reach verified candidates. Applications land pre-populated with the applicant\'s ORCID profile — no CV wrangling. Move applicants across a Kanban board from Applied to Interview to Closed.',
    stats: [
      { v: '4-stage', l: 'Applicant kanban pipeline' },
      { v: '0', l: 'CVs to manually parse' },
    ],
    features: [
      'Structured job posting workflow',
      'Applicant kanban with live counts',
      'Verified institution badge',
      'Institution-scoped visibility & controls',
    ],
  },
  {
    id: 'platform',
    emoji: '🛡',
    label: 'Platform Admin',
    color: '#1A237E',
    badge: 'Trust & Safety Console',
    title: 'Moderation, verification, and integrity oversight.',
    description:
      'Approve or reject institution registrations with a full audit trail. Monitor platform-wide health via aggregated dashboards. Uphold IT Rules 2021 grievance workflow SLAs.',
    stats: [
      { v: '24-72h', l: 'IT Rules 2021 grievance SLA' },
      { v: '100%', l: 'Verification audit trail' },
    ],
    features: [
      'Institution / organizer verification queue',
      'Platform-wide aggregate dashboards',
      'UGC-CARE list sync + override table',
      'Report / grievance workflow with SLA timers',
    ],
  },
];

const CAPABILITIES = [
  {
    emoji: '🧬',
    title: 'ORCID as the profile spine',
    desc: 'Single OAuth connect pulls works, employment, and identity anchors directly into your FacultyConnect profile.',
    color: '#6C5CE7',
    Icon: Link2,
  },
  {
    emoji: '🔎',
    title: 'Discovery — not a feed',
    desc: 'Search-first browsing of FDPs, conferences, grants, and journals. No infinite scroll, no timestamps, no algorithm.',
    color: '#00B894',
    Icon: Compass,
  },
  {
    emoji: '✅',
    title: 'UGC-CARE cross-checking',
    desc: 'Every journal listing is stamped with a "last verified against UGC-CARE on <date>" timestamp for compliance transparency.',
    color: '#F59E0B',
    Icon: BadgeCheck,
  },
  {
    emoji: '📥',
    title: 'One-click apply',
    desc: 'Jobs pre-attach your ORCID-populated profile. Colleges see a clean Kanban board of applicants across pipeline stages.',
    color: '#1A237E',
    Icon: KanbanSquare,
  },
];

const WORKFLOW = [
  {
    step: '01',
    title: 'Sign up in seconds',
    desc: 'Email + password + a required DPDP consent checkbox. No CAPTCHA loops.',
  },
  {
    step: '02',
    title: 'Connect ORCID',
    desc: 'One OAuth click pulls your publications, employment history, and identity anchors.',
  },
  {
    step: '03',
    title: 'Enrich with Scopus + Crossref',
    desc: 'Real citation counts, computed h-index, and complete author metadata — automatically.',
  },
  {
    step: '04',
    title: 'Discover & apply',
    desc: 'Browse verified opportunities and apply to jobs with your ORCID-populated profile.',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [activePortalTab, setActivePortalTab] = useState('faculty');
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);

  const activePortal = PORTALS.find(p => p.id === activePortalTab);

  return (
    <div className="relative overflow-x-hidden bg-[#F8FAFC] text-[#334155] min-h-screen">
      {/* Background glow blobs */}
      <div
        className="fixed pointer-events-none z-0"
        style={{
          top: '-15%',
          left: '-10%',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(108,92,231,0.08) 0%, transparent 70%)',
          filter: 'blur(90px)',
        }}
      />
      <div
        className="fixed pointer-events-none z-0"
        style={{
          top: '25%',
          right: '-15%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,184,148,0.06) 0%, transparent 70%)',
          filter: 'blur(90px)',
        }}
      />
      <div
        className="fixed pointer-events-none z-0"
        style={{
          bottom: '-10%',
          left: '15%',
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(26,35,126,0.05) 0%, transparent 70%)',
          filter: 'blur(100px)',
        }}
      />

      <div className="relative z-10">
        {/* Sticky glass header */}
        <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="text-xl font-extrabold tracking-tight text-secondary">FacultyConnect</div>
            <div className="flex items-center gap-8">
              <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
                <a href="#portals" className="hover:text-slate-900 transition-colors">Portals</a>
                <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
                <a href="#workflow" className="hover:text-slate-900 transition-colors">How it works</a>
              </nav>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)',
                  boxShadow: '0 4px 14px rgba(108,92,231,0.25)',
                }}
              >
                Sign in <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6">
          {/* HERO */}
          <section className="text-center pt-24 pb-16">
            <motion.div initial="hidden" animate="visible" variants={stagger}>
              <motion.div
                variants={fade}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold mb-8"
                style={{
                  background: 'rgba(108, 92, 231, 0.06)',
                  borderColor: 'rgba(108, 92, 231, 0.2)',
                  color: '#6C5CE7',
                }}
              >
                <Sparkles size={14} /> Built for Indian college faculty
              </motion.div>

              <motion.h1
                variants={fade}
                className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6"
                style={{ color: '#0F172A' }}
              >
                <span
                  className="inline-block bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(135deg, #6C5CE7 0%, #00B894 100%)' }}
                >
                  The academic profile
                </span>
                <br />
                that builds itself.
              </motion.h1>

              <motion.p
                variants={fade}
                className="max-w-2xl mx-auto text-base md:text-lg text-slate-600 leading-relaxed mb-10"
              >
                FacultyConnect aggregates <strong>verified</strong> FDPs, conferences, grants, and
                journals — auto-populates your profile from ORCID + Scopus — and helps Indian
                colleges reach the right faculty. No content feed. No scraping. No predatory venues.
              </motion.p>

              <motion.div variants={fade} className="flex gap-3 justify-center flex-wrap mb-16">
                <button
                  onClick={() => navigate('/signup')}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-white font-bold transition-transform hover:-translate-y-0.5"
                  style={{
                    background: 'linear-gradient(135deg, #6C5CE7 0%, #00B894 100%)',
                    boxShadow: '0 8px 30px rgba(108,92,231,0.22)',
                  }}
                >
                  Create your account <ArrowRight size={18} />
                </button>
                <a href="#portals">
                  <button className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white/90 border border-slate-200 text-slate-900 font-bold hover:bg-slate-50 transition-colors">
                    Explore the portals <ChevronRight size={16} />
                  </button>
                </a>
              </motion.div>
            </motion.div>
          </section>

          {/* Stats counter bar */}
          <section className="mb-24">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {STATS.map(({ n, label }, i) => (
                <motion.div
                  key={label}
                  initial={{ y: 12, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl p-6 text-center border border-slate-200/60 bg-white/70 backdrop-blur-sm"
                  style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}
                >
                  <div
                    className="text-2xl md:text-3xl font-black bg-clip-text text-transparent"
                    style={{ backgroundImage: 'linear-gradient(135deg, #6C5CE7 0%, #00B894 100%)' }}
                  >
                    {n}
                  </div>
                  <div className="text-[11px] md:text-xs mt-1 text-slate-500 font-semibold uppercase tracking-wider">
                    {label}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Portal tour */}
          <section id="portals" className="mb-24 scroll-mt-24">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2">
                Three portals, one platform
              </h2>
              <p className="text-slate-600">
                Faculty, College Admin, and Platform Admin — each with a purpose-built workspace.
              </p>
            </div>

            <div className="flex gap-2 bg-slate-100/60 border border-slate-200/60 rounded-2xl p-1.5 mb-8 overflow-x-auto">
              {PORTALS.map(portal => {
                const active = activePortalTab === portal.id;
                return (
                  <button
                    key={portal.id}
                    onClick={() => setActivePortalTab(portal.id)}
                    className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold whitespace-nowrap transition-all ${
                      active ? 'bg-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    style={active ? { color: portal.color } : undefined}
                  >
                    <span className="text-xl">{portal.emoji}</span>
                    <span>{portal.label}</span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activePortalTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="rounded-3xl bg-white/80 border border-slate-200/60 p-6 md:p-10 grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-8 md:gap-12 items-center backdrop-blur-md"
                style={{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.05)' }}
              >
                <div className="flex flex-col gap-5">
                  <div
                    className="inline-flex px-3 py-1.5 rounded-md text-xs font-extrabold uppercase tracking-wide w-fit"
                    style={{
                      background: `${activePortal.color}15`,
                      border: `1px solid ${activePortal.color}30`,
                      color: activePortal.color,
                    }}
                  >
                    {activePortal.badge}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
                    {activePortal.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">{activePortal.description}</p>

                  <div className="flex gap-8 py-2">
                    {activePortal.stats.map((s, i) => (
                      <div key={i}>
                        <div
                          className="text-2xl font-black"
                          style={{ color: activePortal.color }}
                        >
                          {s.v}
                        </div>
                        <div className="text-xs text-slate-500 font-semibold mt-1">{s.l}</div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => navigate('/signup')}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-white font-bold text-sm w-fit transition-transform hover:-translate-y-0.5"
                    style={{
                      background: activePortal.color,
                      boxShadow: `0 4px 14px ${activePortal.color}30`,
                    }}
                  >
                    Get started <ChevronRight size={16} />
                  </button>
                </div>

                <div className="rounded-2xl bg-slate-50/80 border border-slate-200/60 p-6">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
                    What you get
                  </h4>
                  <div className="flex flex-col gap-3">
                    {activePortal.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                          style={{
                            background: `${activePortal.color}15`,
                            color: activePortal.color,
                          }}
                        >
                          <Check size={13} strokeWidth={3} />
                        </div>
                        <span className="text-sm text-slate-700 leading-snug">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </section>

          {/* Core capabilities bento */}
          <section id="features" className="mb-24 scroll-mt-24">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2">
                Built for the way academics actually work
              </h2>
              <p className="text-slate-600">
                Four decisions that keep FacultyConnect useful — and different from LinkedIn.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CAPABILITIES.map((cap, i) => (
                <motion.div
                  key={cap.title}
                  initial={{ y: 12, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="relative rounded-2xl p-6 md:p-8 border overflow-hidden transition-all hover:-translate-y-1"
                  style={{
                    background: `${cap.color}06`,
                    borderColor: `${cap.color}20`,
                  }}
                >
                  <div
                    className="absolute -top-4 -right-4 opacity-10 pointer-events-none"
                    style={{ color: cap.color }}
                  >
                    <cap.Icon size={120} />
                  </div>
                  <div className="text-3xl mb-3">{cap.emoji}</div>
                  <h3 className="text-lg font-extrabold text-slate-900 mb-2">{cap.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{cap.desc}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Workflow stepper */}
          <section id="workflow" className="mb-24 scroll-mt-24">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2">
                From signup to first application in under 5 minutes
              </h2>
              <p className="text-slate-600">
                No re-typing your CV. No manually adding papers. Just connect and go.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-12 items-center">
              <div className="flex flex-col gap-3">
                {WORKFLOW.map((wf, i) => {
                  const active = activeWorkflowStep === i;
                  return (
                    <div
                      key={wf.step}
                      onClick={() => setActiveWorkflowStep(i)}
                      className={`flex items-center gap-5 rounded-2xl p-5 cursor-pointer transition-all border ${
                        active
                          ? 'bg-white border-slate-200 shadow-sm'
                          : 'border-transparent hover:bg-slate-100/60'
                      }`}
                    >
                      <div
                        className={`text-lg font-black w-8 ${active ? 'text-primary' : 'text-slate-300'}`}
                      >
                        {wf.step}
                      </div>
                      <div>
                        <h4
                          className={`text-base font-extrabold ${active ? 'text-slate-900' : 'text-slate-500'}`}
                        >
                          {wf.title}
                        </h4>
                        {active && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="text-sm text-slate-600 leading-relaxed mt-1"
                          >
                            {wf.desc}
                          </motion.p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                className="rounded-3xl p-8 border relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
                  borderColor: 'rgba(108,92,231,0.15)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.04)',
                }}
              >
                <div className="absolute -top-4 -right-4 text-8xl opacity-5">🧬</div>
                <h3 className="text-lg font-extrabold text-slate-900 mb-2 flex items-center gap-2">
                  <FileCheck2 size={18} className="text-success" /> Live sync status
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Once connected, FacultyConnect keeps your profile current — nightly ORCID re-syncs
                  bring new works in automatically.
                </p>

                <div className="rounded-xl bg-slate-50/80 border border-slate-200/60 p-4 flex flex-col gap-2">
                  {[
                    { label: 'ORCID', value: 'Linked', color: '#00B894' },
                    { label: 'Publications', value: 'Auto-imported', color: '#6C5CE7' },
                    { label: 'Citations', value: 'Scopus-enriched', color: '#F59E0B' },
                    { label: 'CV', value: 'One-click PDF', color: '#1A237E' },
                  ].map((row, i, arr) => (
                    <div
                      key={row.label}
                      className={`flex justify-between text-xs ${
                        i < arr.length - 1 ? 'border-b border-slate-200/60 pb-2' : ''
                      }`}
                    >
                      <span className="text-slate-500 uppercase tracking-wide">{row.label}</span>
                      <span className="font-bold" style={{ color: row.color }}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* CTA banner */}
          <section className="mb-24">
            <div
              className="rounded-3xl px-8 md:px-12 py-12 md:py-16 text-center border relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #F8FAFC 0%, #EEF2F6 100%)',
                borderColor: 'rgba(108,92,231,0.15)',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.04)',
              }}
            >
              <div
                className="absolute -top-8 -right-8"
                style={{
                  width: 320,
                  height: 320,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(108,92,231,0.10) 0%, transparent 70%)',
                  filter: 'blur(30px)',
                }}
              />
              <div className="relative flex flex-col items-center gap-5">
                <h2 className="text-3xl md:text-4xl font-black text-slate-900">
                  Ready to stop retyping your CV?
                </h2>
                <p className="text-slate-600 max-w-lg text-base md:text-lg leading-relaxed">
                  Sign up in 30 seconds. Connect ORCID in one click. Your profile builds itself.
                </p>
                <button
                  onClick={() => navigate('/signup')}
                  className="inline-flex items-center gap-2 px-9 py-4 rounded-xl text-white font-bold text-base mt-2 transition-transform hover:-translate-y-0.5"
                  style={{
                    background: 'linear-gradient(135deg, #6C5CE7 0%, #00B894 100%)',
                    boxShadow: '0 8px 30px rgba(108,92,231,0.25)',
                  }}
                >
                  Get started free <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200/60 bg-white/60 backdrop-blur-sm px-6 pt-16 pb-8">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
            <div className="col-span-2">
              <div className="text-xl font-extrabold tracking-tight text-secondary mb-3">
                FacultyConnect
              </div>
              <p className="text-sm text-slate-600 leading-relaxed max-w-sm">
                Academic Discovery, Profile & Collaboration Platform for Indian college faculty.
                Built with ORCID as the identity spine and UGC-CARE verification at the core.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3">Portals</h4>
              <div className="flex flex-col gap-2 text-sm text-slate-600">
                <Link to="/login" className="hover:text-primary transition-colors">Faculty portal</Link>
                <Link to="/login" className="hover:text-primary transition-colors">College Admin portal</Link>
                <Link to="/login" className="hover:text-primary transition-colors">Platform Admin portal</Link>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900 mb-3">Compliance</h4>
              <div className="flex flex-col gap-2 text-sm text-slate-600">
                <div className="inline-flex items-center gap-1.5">
                  <Shield size={14} className="text-success" /> DPDP Act 2023
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <Shield size={14} className="text-success" /> IT Rules 2021
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-primary" /> UGC-CARE synced
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-6xl mx-auto border-t border-slate-200/60 pt-6 flex flex-wrap justify-between items-center gap-4 text-xs text-slate-500">
            <span>&copy; {new Date().getFullYear()} FacultyConnect. All rights reserved.</span>
            <div className="flex gap-6">
              <a className="hover:text-primary cursor-pointer">Privacy</a>
              <a className="hover:text-primary cursor-pointer">Terms</a>
              <a className="hover:text-primary cursor-pointer">Grievance Officer</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
