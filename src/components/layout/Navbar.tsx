import { Search, Menu, User, PlusCircle, LogOut, X, Shield, Info, UserCircle, Sparkles, Download, Palette, Filter, ChevronDown, Activity, Globe, Users } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { cn, useBodyScrollLock } from '../../lib/utils';
import { User as UserType, Category } from '../../types';
import Logo from './Logo';
import ThemeSelector from './ThemeSelector';
import LanguageSelector from './LanguageSelector';
import CategoryMenu from '../gallery/CategoryMenu';
import { useClickOutside } from '../../lib/useClickOutside';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../lib/firebase';
import { getSavedProfiles } from '../../services/profileManager';

interface NavbarProps {
  searchQuery: string;
  onSearch: (query: string) => void;
  isAdmin: boolean;
  user: UserType | null;
  onLogout: () => void;
  onLogin: () => void;
  onOpenProfileSwitcher?: () => void;
  onInstall?: () => void;
  recommendations?: string[];
  // New props for unified filters
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (id: string) => void;
  sortOrder: 'random' | 'latest' | 'popular' | 'oldest' | 'trending';
  onSortChange: (order: 'random' | 'latest' | 'popular' | 'oldest' | 'trending') => void;
  mediaType: 'all' | 'image' | 'video';
  onMediaTypeChange: (type: 'all' | 'image' | 'video') => void;
  aspectRatioFilter: 'all' | 'portrait' | 'landscape' | 'square' | 'ultrawide';
  onAspectRatioChange: (ratio: 'all' | 'portrait' | 'landscape' | 'square' | 'ultrawide') => void;
  currentTheme: string;
  onThemeChange: (themeId: string) => void;
}

export default React.memo(function Navbar({ 
  searchQuery, 
  onSearch, 
  isAdmin, 
  user, 
  onLogout, 
  onLogin, 
  onOpenProfileSwitcher, 
  onInstall, 
  recommendations = [],
  categories,
  activeCategory,
  onCategoryChange,
  sortOrder,
  onSortChange,
  mediaType,
  onMediaTypeChange,
  aspectRatioFilter,
  onAspectRatioChange,
  currentTheme,
  onThemeChange
}: NavbarProps) {
  const [branding, setBranding] = useState({
    logoLink: '/',
    logoTitle: 'Aether',
    logoIconUrl: ''
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, COLLECTIONS.APP_SETTINGS, 'global_config'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setBranding({
          logoLink: data.logoLink || '/',
          logoTitle: data.logoTitle || 'Aether',
          logoIconUrl: data.logoIconUrl || ''
        });
      }
    }, (err) => {
      console.warn("Branding failed to resolve in Navbar, defaults used.", err);
    });
    return () => unsub();
  }, []);

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [themeSelectorOpen, setThemeSelectorOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Logo Double-Click and Dual-Tap logic (opens in same tab)
  const lastTapRef = useRef<number>(0);
  const clickTimerRef = useRef<any>(null);
  const longPressTimeout = useRef<any>(null);
  const isLongPressActive = useRef<boolean>(false);
  const pressStarted = useRef<boolean>(false);

  const getLogoTarget = () => {
    return branding.logoIconUrl || (branding.logoLink.startsWith('http') ? branding.logoLink : 'https://i.postimg.cc/8P2zP9z8/aether-logo.png');
  };

  const openLogoInSameTab = () => {
    const targetUrl = getLogoTarget();
    window.open(targetUrl, '_self');
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    clickTimerRef.current = setTimeout(() => {
      navigate('/');
    }, 250);
  };

  const handleLogoDoubleClick = (e: React.MouseEvent) => {
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    e.preventDefault();
    e.stopPropagation();
    openLogoInSameTab();
  };

  const handleLogoTouchStart = (e: React.TouchEvent) => {
    pressStarted.current = true;
    isLongPressActive.current = false;
    longPressTimeout.current = setTimeout(() => {
      isLongPressActive.current = true;
      openLogoInSameTab();
    }, 800);
  };

  const handleLogoTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
    }
    if (isLongPressActive.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 350;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      e.preventDefault();
      e.stopPropagation();
      lastTapRef.current = 0;
      openLogoInSameTab();
    } else {
      lastTapRef.current = now;
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
      clickTimerRef.current = setTimeout(() => {
        navigate('/');
      }, 250);
    }
  };

  const handleLogoTouchCancel = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
    }
  };

  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const filterMenuRef = React.useRef<HTMLDivElement>(null);

  useClickOutside(userMenuRef, () => setUserMenuOpen(false));
  useClickOutside(filterMenuRef, () => setFiltersOpen(false));

  useBodyScrollLock(filtersOpen || mobileSearchOpen);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onSearch(val);
    setShowRecommendations(true);
    if (val && location.pathname !== '/') {
      navigate('/');
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[60] bg-bg-dark/60 backdrop-blur-3xl border-b border-white/[0.05] h-[72px] md:h-[80px] flex items-center px-4 gap-3 md:gap-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        {/* AETHER LOGO - Extreme Left */}
        <div className="flex items-center shrink-0">
          <div 
            onClick={handleLogoClick}
            onDoubleClick={handleLogoDoubleClick}
            onTouchStart={handleLogoTouchStart}
            onTouchEnd={handleLogoTouchEnd}
            onTouchCancel={handleLogoTouchCancel}
            onContextMenu={(e) => e.preventDefault()}
            title="Double-click to open in same tab"
            className="flex items-center gap-3 group relative cursor-pointer select-none"
          >
            <div className="absolute inset-x-0 -inset-y-4 bg-brand-primary/10 blur-3xl rounded-full opacity-50" />
            <div className="relative z-10 transition-transform group-hover:scale-105">
              <Logo size="xs" />
            </div>
            <span className="font-display font-medium text-[15px] tracking-[0.2em] uppercase text-text-main hidden lg:block opacity-90 group-hover:opacity-100 transition-all">
              {branding.logoTitle}
            </span>
          </div>
        </div>
        
        {/* SEARCH BAR - Dynamic Width */}
        <div className="flex-1 min-w-0 max-w-4xl relative group">
          <div className="relative flex items-center">
            <Search className="absolute left-4 md:left-5 w-4 h-4 text-text-dim/30 group-focus-within:text-brand-primary transition-all duration-500" />
            <input
              type="text"
              placeholder={t('nav.search')}
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full h-[46px] md:h-[52px] pl-12 md:pl-14 pr-10 bg-white/[0.04] border border-white/[0.05] rounded-full text-text-main text-[13px] md:text-[14px] font-medium focus:outline-none focus:bg-white/[0.07] focus:border-brand-primary/40 focus:ring-4 focus:ring-brand-primary/5 transition-all placeholder:text-text-dim/20 hover:bg-white/[0.06] shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => { onSearch(''); setShowRecommendations(false); }}
                className="absolute right-4 p-1 rounded-full text-text-dim/40 hover:text-text-main hover:bg-white/10 transition-all cursor-pointer"
                title="Clear Search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <AnimatePresence>
            {recommendations.length > 0 && searchQuery && showRecommendations && (
              <motion.div
                key="search-recommendations-wrapper"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 right-0 z-50 mt-3 p-1.5 bg-card-dark/95 backdrop-blur-3xl border border-white/10 rounded-[24px] shadow-[0_40px_80px_rgba(0,0,0,0.9)] overflow-hidden"
              >
                <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-brand-primary" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-text-dim/40">{t('nav.search')}</span>
                </div>
                {Array.from(new Set(recommendations)).filter(Boolean).map((rec, i) => (
                  <button
                    key={`nav-rec-${rec.slice(0, 20)}-${i}`}
                    onClick={() => { onSearch(rec); setShowRecommendations(false); }}
                    className="w-full px-4 py-3 text-left text-xs font-bold text-text-dim hover:text-white hover:bg-brand-primary/10 transition-all flex items-center justify-between group/rec"
                  >
                    <div className="flex items-center gap-3">
                      <Activity className="w-3.5 h-3.5 text-brand-primary/40 group-hover/rec:text-brand-primary transition-all" />
                      <span className="tracking-tight uppercase tracking-widest text-[9px]">{rec}</span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 -rotate-90 opacity-0 group-hover/rec:opacity-40 transition-opacity" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* CONTROLS - Right Aligned */}
        <div className="flex items-center gap-2 md:gap-3 ml-auto shrink-0">
          {/* FILTER BUTTON */}
          <button 
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={cn(
              "w-10 h-10 md:w-11 md:h-11 flex items-center justify-center rounded-full transition-all duration-500 relative group",
              filtersOpen 
                ? "bg-brand-primary text-bg-dark shadow-[0_0_30px_rgba(var(--brand-primary-rgb),0.4)] scale-110" 
                : "bg-white/[0.04] border border-white/[0.05] text-text-dim/40 hover:text-brand-primary hover:bg-brand-primary/5 hover:border-brand-primary/30"
            )}
            title={t('common.explore')}
          >
            <Filter className="w-4.5 h-4.5 md:w-5 md:h-5" />
          </button>

          {/* PROFILE ICON */}
          {user ? (
            <div ref={userMenuRef} className="relative">
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-0.5 rounded-full border border-white/[0.1] hover:border-brand-primary/30 transition-all bg-white/[0.02] shadow-2xl hover:scale-110 active:scale-95 group relative"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" referrerPolicy="no-referrer" className="w-[36px] h-[36px] md:w-[42px] md:h-[42px] rounded-full object-cover" />
                ) : (
                  <div className="w-[36px] h-[36px] md:w-[42px] md:h-[42px] rounded-full bg-white/5 flex items-center justify-center">
                    <User className="w-5 h-5 text-text-dim" />
                  </div>
                )}
                <div className="absolute -inset-1 rounded-full bg-brand-primary/20 opacity-0 group-hover:opacity-100 blur-lg transition-opacity duration-500" />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div 
                    key="user-menu-content"
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-3 w-56 bg-card-dark/95 border border-white/20 rounded-[24px] shadow-[0_30px_60px_rgba(0,0,0,0.8)] py-1.5 overflow-hidden z-[101] backdrop-blur-[30px] ring-1 ring-white/5"
                  >
                    <div className="px-4 py-3 border-b border-white/5 mb-1 bg-white/[0.01]">
                      <p className="text-[11px] font-black uppercase tracking-tight text-text-main truncate">{user.displayName || 'Account'}</p>
                      <p className="text-[9px] text-text-dim/60 truncate mt-0.5 tracking-tight font-medium uppercase font-mono">{user.email}</p>
                    </div>
                    
                    <div className="py-1">
                      <Link to="/profile" onClick={() => setUserMenuOpen(false)} className="px-4 py-2.5 hover:bg-white/[0.03] flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.1em] text-text-dim hover:text-text-main transition-all">
                        <UserCircle className="w-3.5 h-3.5" /> {t('nav.my_registry')}
                      </Link>
                      {onOpenProfileSwitcher && (
                        <button 
                          onClick={() => { onOpenProfileSwitcher(); setUserMenuOpen(false); }} 
                          className="w-full px-4 py-2.5 hover:bg-white/[0.03] flex items-center justify-between text-[10px] font-black uppercase tracking-[0.1em] text-brand-primary hover:text-brand-primary transition-all text-left"
                        >
                          <div className="flex items-center gap-3">
                            <Users className="w-3.5 h-3.5" /> Switch Profile
                          </div>
                          {getSavedProfiles().length > 1 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-brand-primary/20 text-brand-primary text-[8px] font-mono font-bold">
                              {getSavedProfiles().length}
                            </span>
                          )}
                        </button>
                      )}
                      <button onClick={() => { setThemeSelectorOpen(true); setUserMenuOpen(false); }} className="w-full px-4 py-2.5 hover:bg-white/[0.03] flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.1em] text-brand-primary hover:text-brand-primary transition-all">
                        <Palette className="w-3.5 h-3.5" /> {t('nav.theme')}
                      </button>
                      <button onClick={() => { setLanguageOpen(true); setUserMenuOpen(false); }} className="w-full px-4 py-2.5 hover:bg-white/[0.03] flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.1em] text-text-dim hover:text-text-main transition-all">
                        <Globe className="w-3.5 h-3.5" /> {t('nav.language')}
                      </button>
                      {onInstall && (
                        <button onClick={() => { onInstall(); setUserMenuOpen(false); }} className="w-full px-4 py-2.5 hover:bg-white/[0.03] flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.1em] text-brand-primary transition-all">
                          <Download className="w-3.5 h-3.5" /> {t('nav.install')}
                        </button>
                      )}
                      {!user.isPremium && (
                        <Link to="/upgrade" onClick={() => setUserMenuOpen(false)} className="px-4 py-2.5 hover:bg-white/[0.03] flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.1em] text-brand-primary transition-all">
                          <Sparkles className="w-3.5 h-3.5" /> {t('nav.upgrade')}
                        </Link>
                      )}
                      <Link to="/upload" onClick={() => setUserMenuOpen(false)} className="px-4 py-2.5 hover:bg-white/[0.03] flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.1em] text-brand-primary transition-all">
                        <PlusCircle className="w-3.5 h-3.5" /> {t('nav.post') || 'Share Vision'}
                      </Link>
                      <Link to="/about" onClick={() => setUserMenuOpen(false)} className="px-4 py-2 hover:bg-white/[0.03] flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.1em] text-text-dim hover:text-text-main transition-all">
                        <Info className="w-3.5 h-3.5" /> {t('nav.about')}
                      </Link>
                      <Link to="/developer" onClick={() => setUserMenuOpen(false)} className="px-4 py-2 hover:bg-white/[0.03] flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.1em] text-text-dim hover:text-text-main transition-all">
                        <Activity className="w-3.5 h-3.5" /> {t('nav.architect')}
                      </Link>
                    </div>

                    {isAdmin && (
                      <div className="border-t border-white/[0.05] mt-1 pt-1">
                        <div className="px-4 py-1.5 text-[7px] font-black uppercase tracking-[0.2em] text-text-dim/40">{t('nav.management')}</div>
                        <Link to="/admin" onClick={() => setUserMenuOpen(false)} className="px-4 py-2 hover:bg-white/[0.03] flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-primary transition-all">
                          <Palette className="w-3.5 h-3.5" /> {t('nav.assets') || 'Architect Terminal'}
                        </Link>
                        <Link to="/moderation" onClick={() => setUserMenuOpen(false)} className="px-4 py-2 hover:bg-white/[0.03] flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-primary transition-all">
                          <Shield className="w-3.5 h-3.5" /> {t('nav.moderation')}
                        </Link>
                      </div>
                    )}

                    <div className="border-t border-white/[0.05] mt-1 pt-1">
                      <button onClick={onLogout} className="w-full px-4 py-2.5 hover:bg-red-500/10 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.1em] text-red-500/80 hover:text-red-500 transition-all">
                        <LogOut className="w-3.5 h-3.5" /> {t('nav.disconnect')}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button 
              onClick={onLogin}
              className="px-5 py-2.5 bg-text-main text-bg-dark font-medium uppercase tracking-[0.2em] rounded-full text-[10px] hover:scale-105 transition-all shadow-2xl active:scale-95 flex items-center gap-2 group border border-white/10"
            >
              <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
              <span className="xs:inline">{t('nav.enter')}</span>
            </button>
          )}
        </div>
      </nav>

      {/* FILTER DRAWER / OVERLAY */}
      <AnimatePresence>
        {filtersOpen && (
          <div className="fixed inset-0 z-[100]">
            <motion.div
              key="filter-overlay-bg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-bg-dark/60 backdrop-blur-md"
              onClick={() => setFiltersOpen(false)}
            />
            <motion.div
              ref={filterMenuRef}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="relative top-[80px] md:top-[88px] left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 pointer-events-none"
            >
              <div className="bg-card-dark/95 backdrop-blur-3xl border border-white/5 rounded-[32px] shadow-[0_40px_100px_rgba(0,0,0,0.8)] p-6 pointer-events-auto">
                <CategoryMenu 
                  categories={categories}
                  activeCategoryId={activeCategory}
                  onCategorySelect={(id) => { onCategoryChange(id); setFiltersOpen(false); }}
                  sortOrder={sortOrder}
                  onSortSelect={(ord) => { onSortChange(ord); }}
                  mediaType={mediaType}
                  onMediaTypeSelect={(type) => { onMediaTypeChange(type); }}
                  aspectRatioFilter={aspectRatioFilter}
                  onAspectRatioSelect={(ratio) => { onAspectRatioChange(ratio); }}
                  isLoggedIn={!!user}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      <ThemeSelector 
        isOpen={themeSelectorOpen}
        onClose={() => setThemeSelectorOpen(false)}
        currentTheme={currentTheme}
        onThemeSelect={onThemeChange}
        isAdmin={isAdmin}
      />

      <LanguageSelector 
        isOpen={languageOpen}
        onClose={() => setLanguageOpen(false)}
      />

      {/* Mobile Search Overlay remains similar but streamlined */}

      {/* Mobile Search Overlay - Immersive & Minimalist */}
      {mobileSearchOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-bg-dark backdrop-blur-3xl animate-in fade-in duration-300"
          onClick={() => setMobileSearchOpen(false)}
        >
          <div 
            className="flex flex-col h-full max-w-2xl mx-auto px-8 pt-12"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-end mb-16">
              <button 
                onClick={() => setMobileSearchOpen(false)}
                className="p-2 text-text-dim hover:text-text-main transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
            </div>
            
            <div className="relative group">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 text-text-dim/20 group-focus-within:text-text-main transition-colors" />
              <input
                autoFocus
                type="text"
                placeholder="Find Your Vision..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e)}
                className="w-full h-20 pl-9 pr-12 bg-transparent border-b border-border-dark text-3xl font-light text-text-main placeholder:text-text-dim/10 focus:outline-none focus:border-text-main transition-all uppercase tracking-tight"
              />
              {searchQuery && (
                <button
                  onClick={() => { onSearch(''); }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-text-dim hover:text-text-main"
                  title="Clear Search"
                >
                  <X className="w-6 h-6" />
                </button>
              )}
            </div>
            
            <div className="mt-12">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-dim/20 mb-4">Discover Curations</p>
              <div className="flex flex-wrap gap-3">
                {Array.from(new Set(recommendations)).filter(Boolean).map((rec, i) => (
                   <button 
                     key={`mobile-rec-${rec.slice(0, 20)}-${i}`} 
                     onClick={() => { onSearch(rec); setMobileSearchOpen(false); }}
                     className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-text-main hover:bg-brand-primary/20 hover:border-brand-primary/50 transition-all uppercase tracking-widest"
                   >
                     {rec}
                   </button>
                ))}
                {recommendations.length === 0 && <div className="w-8 h-px bg-white/20"></div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
