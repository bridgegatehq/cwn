import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  Bell,
  Sun,
  Moon,
  Globe,
  ShieldCheck,
  FilePlus2,
  Home,
  Scale,
  Megaphone,
  Users,
  BookOpen,
  Clock,
  BarChart3,
  User,
  Info,
  MessageSquare,
  MessageCircle,
  Rss,
  Flame,
  Briefcase,
  Sliders,
  WifiOff,
  LogIn,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Monitor,
  Sparkles,
} from 'lucide-react';
import { LANGUAGES, type LangCode } from '../data/i18n';
import { useApp } from '../context/AppContext';
import { MobileAppGateModal } from './MobileAppGateModal';
import { CookieConsentBanner } from './CookieConsentBanner';
import { LandingPage } from '../pages/LandingPage';

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    user,
    lang,
    setLang,
    t,
    theme,
    toggleTheme,
    editionMode,
    setEditionMode,
    unreadCount,
    isOffline,
  } = useApp();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  // Dedicated Landing Page on `/` when in Web App mode
  const isLandingRoute = location.pathname === '/' && editionMode === 'web';
  if (isLandingRoute) {
    return (
      <>
        <LandingPage />
        <MobileAppGateModal />
        <CookieConsentBanner />
      </>
    );
  }

  // Compressed, focused primary navigation (5 calm top-level items — zero cognitive overload)
  const coreNavItems = [
    { to: '/home', label: t.home, shortLabel: t.shortHome, icon: Home },
    { to: '/report', label: t.reportIncident, shortLabel: t.shortReport, icon: FilePlus2 },
    { to: '/justice', label: t.legalHelp, shortLabel: t.shortLegal, icon: Scale },
    { to: '/knowledge', label: t.knowRights, shortLabel: t.shortRights, icon: BookOpen },
    { to: '/mobilise', label: t.mobilise, shortLabel: t.shortMobilise, icon: Megaphone },
  ];

  // Secondary & role-specific routes tucked neatly inside one expandable "More & workspaces" disclosure
  const secondaryNavItems = [
    { to: '/community', label: t.community, icon: Users },
    { to: '/live-feed', label: t.liveTitle, icon: Rss },
    { to: '/trending', label: t.trendTitle, icon: Flame },
    { to: '/messenger-updates', label: t.botTitle, icon: MessageCircle },
    { to: '/dashboard', label: t.dashboard, icon: BarChart3 },
    { to: '/timeline', label: t.myTimeline, icon: Clock },
    { to: '/assistant', label: t.assistant, icon: MessageSquare },
    { to: '/notifications', label: t.notifications, icon: Bell },
    { to: '/advocate-portal', label: t.advocatePortal, icon: Briefcase },
    { to: '/admin', label: t.adminCentre, icon: Sliders },
    { to: '/profile', label: t.profile, icon: User },
    { to: '/about', label: t.aboutDonate, icon: Info },
  ];

  const isOnReportFlow = location.pathname.startsWith('/report');
  const isMobileEdition = editionMode === 'mobile';

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('')
    : null;

  const shellContent = (
    <div className={`app-shell ${isMobileEdition ? 'is-mobile-edition' : ''}`}>
      <a href="#main-content" className="skip-link">
        {t.skipToContent}
      </a>

      {/* Offline Banner */}
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          style={{
            background: 'var(--warning-subtle)',
            borderBottom: '1px solid var(--warning-border)',
            color: 'var(--warning)',
            padding: 'var(--sp-8) var(--sp-20)',
            fontSize: 'var(--text-13)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--sp-8)',
          }}
        >
          <WifiOff size={16} aria-hidden="true" />
          <span>{t.offlineNotice}</span>
        </div>
      )}

      {/* Top Bar */}
      <header className="topbar">
        <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
          <button
            type="button"
            className="btn-icon topbar-mobile-menu"
            onClick={() => setDrawerOpen(true)}
            aria-label={t.openMenu}
            aria-expanded={drawerOpen}
          >
            <Menu size={22} aria-hidden="true" />
          </button>

          <Link
            to={isMobileEdition ? '/home' : '/'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--sp-12)',
              textDecoration: 'none',
              color: 'var(--text)',
              minHeight: '48px',
            }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'var(--primary)',
                color: 'var(--text-on-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <ShieldCheck size={19} />
            </span>
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <strong style={{ fontSize: 'var(--text-14)', lineHeight: 1.15 }}>{t.brandName}</strong>
              <span style={{ fontSize: 'var(--text-12)', color: 'var(--text-secondary)' }}>
                {isMobileEdition ? t.mobileEdition : t.webApp}
              </span>
            </span>
          </Link>
        </div>

        <div className="row-wrap" style={{ gap: 'var(--sp-8)' }}>
          {/* Instant Web App <-> Mobile App Edition Switcher */}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setEditionMode(isMobileEdition ? 'web' : 'mobile')}
            title={isMobileEdition ? t.switchToWebApp : t.mobileEdition}
            style={{ padding: 'var(--sp-8) var(--sp-12)' }}
          >
            {isMobileEdition ? (
              <>
                <Monitor size={15} aria-hidden="true" />
                <span>{t.webView}</span>
              </>
            ) : (
              <>
                <Smartphone size={15} aria-hidden="true" />
                <span>{t.mobileApp}</span>
              </>
            )}
          </button>

          {!isOnReportFlow && !isMobileEdition && (
            <Link to="/report" className="btn btn-accent btn-sm topbar-desktop-cta">
              <FilePlus2 size={16} aria-hidden="true" />
              <span>{t.reportIncident}</span>
            </Link>
          )}

          {/* Language Switcher */}
          {!isMobileEdition && (
            <div style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
              <Globe
                size={15}
                aria-hidden="true"
                style={{ position: 'absolute', left: 10, pointerEvents: 'none', color: 'var(--text-secondary)' }}
              />
              <label htmlFor="global-lang-select" className="sr-only">
                {t.selectLanguage}
              </label>
              <select
                id="global-lang-select"
                value={lang}
                onChange={(e) => setLang(e.target.value as LangCode)}
                className="select"
                style={{
                  minHeight: '48px',
                  paddingLeft: '30px',
                  paddingRight: 'var(--sp-8)',
                  width: 'auto',
                  maxWidth: '136px',
                  fontSize: 'var(--text-13)',
                }}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notification Bell */}
          <Link
            to="/notifications"
            className="btn-icon"
            aria-label={`${t.notificationsAria}${unreadCount > 0 ? `, ${unreadCount}` : ''}`}
            style={{ position: 'relative', textDecoration: 'none' }}
          >
            <Bell size={20} aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  minWidth: 18,
                  height: 18,
                  padding: '0 4px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--danger)',
                  color: 'var(--text-on-primary)',
                  fontSize: 'var(--text-12)',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {unreadCount}
              </span>
            )}
          </Link>

          {/* Theme Toggle */}
          <button
            type="button"
            className="btn-icon"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? t.switchToDark : t.switchToLight}
          >
            {theme === 'light' ? <Moon size={19} aria-hidden="true" /> : <Sun size={19} aria-hidden="true" />}
          </button>

          {/* Profile / Sign In */}
          <Link
            to={user ? '/profile' : '/auth'}
            className="btn-icon"
            aria-label={user ? `${t.profileAria}: ${user.fullName}` : t.signInRegister}
            style={{ textDecoration: 'none' }}
          >
            {initials ? (
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--primary-subtle)',
                  border: '1px solid var(--primary-border)',
                  color: 'var(--primary)',
                  fontSize: 'var(--text-12)',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {initials}
              </span>
            ) : (
              <LogIn size={19} aria-hidden="true" />
            )}
          </Link>
        </div>
      </header>

      <div className="shell-body">
        {/* Compressed Desktop Left Sidebar (5 Core Items + 1 Expandable More Disclosure) */}
        <aside className="desktop-sidebar" aria-label="Primary navigation">
          <div style={{ padding: '0 var(--sp-4) var(--sp-16)' }}>
            <Link to="/report" className="btn btn-accent btn-full" title={t.reportIncident}>
              <FilePlus2 size={18} aria-hidden="true" />
              <span className="sidebar-label-hide-mid">{t.reportIncident}</span>
            </Link>
          </div>

          <div className="stack-8" style={{ gap: 'var(--sp-4)' }}>
            {coreNavItems
              .filter((item) => item.to !== '/report')
              .map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink key={item.to} to={item.to} className="nav-item" title={item.label}>
                    <Icon size={20} aria-hidden="true" style={{ flexShrink: 0 }} />
                    <span className="sidebar-label-hide-mid">{item.label}</span>
                  </NavLink>
                );
              })}
          </div>

          {/* Compressed Secondary Menu */}
          <div style={{ marginTop: 'var(--sp-16)', borderTop: '1px solid var(--border)', paddingTop: 'var(--sp-12)' }}>
            <button
              type="button"
              className="nav-disclosure-btn"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              title={t.moreWorkspaces}
            >
              <span className="sidebar-label-hide-mid">{t.moreWorkspaces}</span>
              {moreOpen ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
            </button>

            {moreOpen && (
              <div className="stack-8" style={{ gap: 'var(--sp-4)', marginTop: 'var(--sp-8)' }}>
                {secondaryNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink key={item.to} to={item.to} className="nav-item" title={item.label}>
                      <Icon size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
                      <span className="sidebar-label-hide-mid">{item.label}</span>
                    </NavLink>
                  );
                })}
                <NavLink to="/" end className="nav-item" title={t.landingOverview}>
                  <Sparkles size={18} aria-hidden="true" style={{ flexShrink: 0 }} />
                  <span className="sidebar-label-hide-mid">{t.landingOverview}</span>
                </NavLink>
              </div>
            )}
          </div>
        </aside>

        {/* Compressed Mobile Hamburger Drawer */}
        {drawerOpen && (
          <div
            className="drawer-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={t.menu}
            onClick={(e) => {
              if (e.target === e.currentTarget) setDrawerOpen(false);
            }}
          >
            <nav className="drawer-panel">
              <div className="row-between">
                <strong style={{ fontSize: 'var(--text-18)' }}>{t.menu}</strong>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setDrawerOpen(false)}
                  aria-label={t.closeMenu}
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              {/* Language selector inside mobile drawer for clean mobile topbar */}
              <div className="field">
                <label htmlFor="drawer-lang-select" className="field-label">
                  {t.language}
                </label>
                <select
                  id="drawer-lang-select"
                  className="select"
                  value={lang}
                  onChange={(e) => setLang(e.target.value as LangCode)}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.nativeName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="stack-8" style={{ gap: 'var(--sp-4)' }}>
                <span className="overline">{t.main}</span>
                {coreNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink key={item.to} to={item.to} className="nav-item">
                      <Icon size={20} aria-hidden="true" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--sp-12)' }}>
                <button
                  type="button"
                  className="nav-disclosure-btn"
                  onClick={() => setMoreOpen((v) => !v)}
                  aria-expanded={moreOpen}
                >
                  <span>{t.moreWorkspaces}</span>
                  {moreOpen ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
                </button>

                {moreOpen && (
                  <div className="stack-8" style={{ gap: 'var(--sp-4)', marginTop: 'var(--sp-8)' }}>
                    {secondaryNavItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink key={item.to} to={item.to} className="nav-item">
                          <Icon size={18} aria-hidden="true" />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="card-subtle stack-8" style={{ marginTop: 'auto' }}>
                {user ? (
                  <>
                    <strong style={{ fontSize: 'var(--text-14)' }}>{user.fullName}</strong>
                    <span className="field-hint">{user.email}</span>
                  </>
                ) : (
                  <Link to="/auth" className="btn btn-secondary btn-sm">
                    <LogIn size={16} aria-hidden="true" />
                    <span>{t.signInRegister}</span>
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}

        {/* Main Content Landmark */}
        <main id="main-content" className="main-content" tabIndex={-1}>
          <div className="container">{children}</div>
        </main>
      </div>

      {/* Compressed 5-Item Mobile Bottom Navigation Bar (Native Mobile Feel, Zero Clutter) */}
      {!isOnReportFlow && (
        <nav className="mobile-bottom-nav" aria-label="Mobile quick navigation">
          {coreNavItems.map((item) => {
            const Icon = item.icon;
            const isReport = item.to === '/report';
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`mobile-tab-item ${isReport ? 'report-pill' : ''}`}
              >
                <Icon size={19} aria-hidden="true" />
                <span>{item.shortLabel}</span>
              </NavLink>
            );
          })}
        </nav>
      )}

      <MobileAppGateModal />
      <CookieConsentBanner />
    </div>
  );

  // When in Mobile App Edition on larger screens, frame cleanly at 412px mobile viewport width
  if (isMobileEdition) {
    return (
      <div className="mobile-edition-stage">
        <div
          style={{
            width: '100%',
            maxWidth: '412px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--sp-8) var(--sp-12)',
          }}
        >
          <span className="overline">{t.mobileEdition}</span>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setEditionMode('web')}
            style={{ minHeight: 36, padding: 'var(--sp-4) var(--sp-12)' }}
          >
            <Monitor size={14} aria-hidden="true" />
            <span>{t.switchToWebApp}</span>
          </button>
        </div>
        <div className="mobile-device-frame">{shellContent}</div>
      </div>
    );
  }

  return shellContent;
}
