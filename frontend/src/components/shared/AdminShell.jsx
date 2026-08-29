import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, X, LogOut, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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

/**
 * Left-sidebar shell for admin consoles (CollegeAdmin, PlatformAdmin).
 * Mirrors the faculty AppHeader's identity primitives: gradient FC brand block,
 * avatar chip with dropdown menu, framer-motion entrance.
 *
 * Props:
 *   accent           CSS color for the active nav item and top brand strip
 *   consoleLabel     shown in the sidebar header (e.g. "College Admin")
 *   consoleSublabel  shown below (e.g. institution name)
 *   nav              [{ key, label, icon, badge? }]
 *   activeKey        currently selected nav key
 *   onSelect         (key) => void
 *   children         content pane
 */
export default function AdminShell({
  accent = '#6C5CE7',
  consoleLabel,
  consoleSublabel,
  nav = [],
  activeKey,
  onSelect,
  children,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const initials = initialsFrom(user?.name || user?.email);
  const displayName = user?.name || user?.email?.split('@')[0] || 'Admin';
  const activeSection = nav.find(n => n.key === activeKey);

  const renderNavItem = item => {
    const isActive = item.key === activeKey;
    const disabled = item.disabled;
    return (
      <button
        key={item.key}
        onClick={() => {
          if (disabled) return;
          onSelect(item.key);
          setMobileOpen(false);
        }}
        disabled={disabled}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-all ${
          isActive
            ? 'text-white font-semibold shadow-sm'
            : disabled
              ? 'text-text-muted/60 cursor-not-allowed'
              : 'text-text-muted hover:bg-muted hover:text-text-light'
        }`}
        style={isActive ? { backgroundColor: accent } : undefined}
      >
        {item.icon && (
          <span className="w-4 h-4 flex items-center justify-center shrink-0">{item.icon}</span>
        )}
        <span className="flex-1 truncate">{item.label}</span>
        {typeof item.badge === 'number' && item.badge > 0 && (
          <span
            className={`text-[10px] font-bold rounded-full px-1.5 min-w-[18px] text-center tabular-nums ${
              isActive ? 'bg-white/25 text-white' : 'bg-muted text-text-muted'
            }`}
          >
            {item.badge}
          </span>
        )}
        {item.badge === 'soon' && (
          <span className="text-[9px] uppercase tracking-wide text-text-muted/70 font-semibold">
            soon
          </span>
        )}
      </button>
    );
  };

  const sidebar = (
    <aside
      className={`w-64 shrink-0 border-r border-border bg-white flex flex-col ${
        mobileOpen ? 'fixed inset-y-0 left-0 z-40 md:relative' : 'hidden md:flex'
      }`}
    >
      <div className="p-4 border-b border-border">
        <motion.div
          initial={{ x: -8, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
            FC
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-secondary text-base tracking-tight leading-tight">
              FacultyConnect
            </div>
            <div
              className="text-[10px] uppercase tracking-wider font-bold mt-0.5"
              style={{ color: accent }}
            >
              {consoleLabel}
            </div>
          </div>
        </motion.div>
        {consoleSublabel && (
          <div className="text-xs text-text-muted mt-3 truncate">{consoleSublabel}</div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">{nav.map(renderNavItem)}</nav>

      <div className="p-3 border-t border-border relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-lg border border-transparent hover:border-border hover:bg-muted transition-colors"
        >
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary text-white text-xs font-bold flex items-center justify-center shrink-0">
            {initials}
          </span>
          <span className="flex-1 min-w-0 text-left">
            <span className="block text-xs font-bold text-text-light truncate">{displayName}</span>
            <span className="block text-[10px] text-text-muted truncate">{user?.email}</span>
          </span>
          <ChevronDown size={13} className="text-text-muted shrink-0" />
        </button>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-3 right-3 mb-2 rounded-xl border border-border bg-white shadow-lg overflow-hidden z-10"
            role="menu"
          >
            {user?.role && (
              <div className="px-3 py-2 border-b border-border">
                <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary rounded-full px-2 py-0.5">
                  {user.role}
                </span>
              </div>
            )}
            <button
              onClick={onLogout}
              className="w-full text-left px-3 py-2 text-sm text-danger hover:bg-danger/5 flex items-center gap-2"
              role="menuitem"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </motion.div>
        )}
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex bg-muted/40">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      {sidebar}
      <div className="flex-1 flex flex-col min-w-0">
        <div
          className="h-1"
          style={{ background: `linear-gradient(to right, ${accent}, ${accent}66)` }}
        />
        <header className="h-14 border-b border-border bg-white/80 backdrop-blur flex items-center justify-between px-4 gap-3 sticky top-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-1.5 rounded-md hover:bg-muted"
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-1.5 text-sm min-w-0">
              <span className="font-semibold text-text-light truncate">{consoleLabel}</span>
              {activeSection && (
                <>
                  <ChevronRight size={14} className="text-text-muted shrink-0" />
                  <span className="text-text-muted truncate">{activeSection.label}</span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-md hover:bg-muted"
            aria-label="Close navigation"
            style={{ display: mobileOpen ? 'block' : 'none' }}
          >
            <X size={18} />
          </button>
        </header>
        <main className="flex-1 overflow-x-auto">{children}</main>
      </div>
    </div>
  );
}
