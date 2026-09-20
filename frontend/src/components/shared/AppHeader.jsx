import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  User,
  Search,
  Briefcase,
  UsersRound,
  Handshake,
  LogOut,
  ChevronDown,
  Bookmark,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getConnectRequestsSummary } from '../../services/connectRequest.service';
import { TYPE_CONFIGS } from '../../lib/opportunityTypes';
import NotificationBell from './NotificationBell';

const NAV = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/profile', label: 'Profile', icon: User },
  { kind: 'discover', label: 'Discover', icon: Search },
  { to: '/jobs', label: 'Jobs', icon: Briefcase },
  { to: '/directory', label: 'Directory', icon: UsersRound },
  { to: '/requests', label: 'Requests', icon: Handshake, badgeKey: 'pendingReceived' },
];

function initialsFrom(nameOrEmail) {
  if (!nameOrEmail) return 'FC';
  const clean = nameOrEmail.replace(/^Dr\.?\s+/i, '').replace(/^Prof\.?\s+/i, '');
  const words = clean.split(/[\s@._-]+/).filter(Boolean);
  const letters = words
    .slice(0, 2)
    .map(w => w.replace(/[^A-Za-z]/g, '')[0])
    .filter(Boolean)
    .join('');
  return (letters || 'FC').toUpperCase();
}

function friendlyName(user) {
  if (!user) return '';
  if (user.name) return user.name;
  return user.email?.split('@')[0] || 'You';
}

export default function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingReceived, setPendingReceived] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const menuRef = useRef(null);
  const discoverRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let timer;
    const load = async () => {
      try {
        const s = await getConnectRequestsSummary();
        if (!cancelled) setPendingReceived(s.pendingReceived || 0);
      } catch {
        /* non-fatal */
      }
    };
    load();
    timer = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  useEffect(() => {
    if (!discoverOpen) return;
    const onClick = e => {
      if (discoverRef.current && !discoverRef.current.contains(e.target)) setDiscoverOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [discoverOpen]);

  const badges = { pendingReceived };
  const initials = initialsFrom(user?.name || user?.email);
  const displayName = friendlyName(user);

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const linkClass = ({ isActive }) =>
    `relative px-3 py-2 text-sm font-medium rounded-md transition-colors inline-flex items-center gap-1.5 ${
      isActive
        ? 'text-primary bg-primary/10'
        : 'text-text-muted hover:text-text-light hover:bg-muted'
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
        <motion.div
          initial={{ x: -8, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2 shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
            FC
          </div>
          <div className="font-extrabold text-secondary text-base tracking-tight hidden sm:block">
            FacultyConnect
          </div>
        </motion.div>

        <nav className="flex-1 flex items-center justify-center gap-0.5 flex-wrap">
          {NAV.map(item => {
            if (item.kind === 'discover') {
              const isActive = location.pathname.startsWith('/discover');
              const Icon = item.icon;
              return (
                <div key="discover" className="relative" ref={discoverRef}>
                  <button
                    onClick={() => setDiscoverOpen(o => !o)}
                    className={`relative px-3 py-2 text-sm font-medium rounded-md transition-colors inline-flex items-center gap-1.5 ${
                      isActive
                        ? 'text-primary bg-primary/10'
                        : 'text-text-muted hover:text-text-light hover:bg-muted'
                    }`}
                    aria-haspopup="menu"
                    aria-expanded={discoverOpen}
                  >
                    <Icon size={14} />
                    <span className="hidden md:inline">{item.label}</span>
                    <ChevronDown
                      size={12}
                      className={`transition-transform ${discoverOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {discoverOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.12 }}
                      className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 rounded-xl border border-border bg-white shadow-lg overflow-hidden z-40"
                      role="menu"
                    >
                      {TYPE_CONFIGS.map(cfg => {
                        const CfgIcon = cfg.Icon;
                        const to = `/discover/${cfg.slug}`;
                        const active = location.pathname === to;
                        return (
                          <button
                            key={cfg.slug}
                            onClick={() => {
                              setDiscoverOpen(false);
                              navigate(to);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-muted ${
                              active ? 'bg-primary/5 text-primary' : 'text-text-light'
                            }`}
                            role="menuitem"
                          >
                            <span
                              className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                              style={{ backgroundColor: `${cfg.color}18`, color: cfg.color }}
                            >
                              <CfgIcon size={15} />
                            </span>
                            <div className="min-w-0">
                              <div className="font-semibold leading-tight">{cfg.label}</div>
                              <div className="text-[11px] text-text-muted truncate">
                                {cfg.singular === 'Journal' ? 'CFPs & UGC-CARE listings' : `Verified ${cfg.label.toLowerCase()}`}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </div>
              );
            }
            const { to, label, icon: Icon, badgeKey } = item;
            const badgeVal = badgeKey ? badges[badgeKey] : 0;
            return (
              <NavLink key={to} to={to} className={linkClass}>
                <Icon size={14} />
                <span className="hidden md:inline">{label}</span>
                {badgeVal > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-danger text-white text-[10px] font-bold px-1 tabular-nums">
                    {badgeVal > 99 ? '99+' : badgeVal}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex items-center gap-1 shrink-0">
          <NotificationBell />
        </div>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border border-border bg-white hover:border-primary/30 hover:bg-primary/5 transition-colors"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary text-white text-xs font-bold flex items-center justify-center">
              {initials}
            </span>
            <span className="hidden sm:block max-w-[140px] truncate text-xs font-semibold text-text-light">
              {displayName}
            </span>
            <ChevronDown size={13} className="text-text-muted" />
          </button>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-white shadow-lg overflow-hidden"
              role="menu"
            >
              <div className="px-4 py-3 border-b border-border">
                <div className="text-sm font-bold text-secondary truncate">{displayName}</div>
                <div className="text-[11px] text-text-muted truncate">{user?.email}</div>
                {user?.role && (
                  <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary rounded-full px-2 py-0.5">
                    {user.role}
                  </span>
                )}
              </div>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/profile');
                }}
                className="w-full text-left px-4 py-2 text-sm text-text-light hover:bg-muted flex items-center gap-2"
                role="menuitem"
              >
                <User size={14} className="text-text-muted" />
                Manage profile
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  navigate('/saved-searches');
                }}
                className="w-full text-left px-4 py-2 text-sm text-text-light hover:bg-muted flex items-center gap-2"
                role="menuitem"
              >
                <Bookmark size={14} className="text-text-muted" />
                Saved searches
              </button>
              <button
                onClick={onLogout}
                className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-danger/5 flex items-center gap-2 border-t border-border"
                role="menuitem"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </header>
  );
}
