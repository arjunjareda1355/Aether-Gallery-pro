import { Search, Menu, User, PlusCircle, LogOut, X, Shield, Bookmark, UserCircle, Sparkles, Download } from 'lucide-react';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { User as UserType } from '../../types';
import Logo from './Logo';

interface NavbarProps {
  onSearch: (query: string) => void;
  isAdmin: boolean;
  user: UserType | null;
  onLogout: () => void;
  onLogin: () => void;
  onInstall?: () => void;
}

export default function Navbar({ onSearch, isAdmin, user, onLogout, onLogin, onInstall }: NavbarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-border-dark min-h-[72px] h-auto flex flex-col md:flex-row items-center justify-between px-4 md:px-10 py-3 md:py-0">
        <div className="flex items-center justify-between w-full md:w-auto gap-4 md:gap-8">
          <Link to="/" className="flex items-center gap-2 md:gap-3 group shrink-0">
            <Logo size="md" />
            <span className="font-display font-black text-[18px] md:text-[22px] tracking-tight uppercase text-white">Aether</span>
          </Link>

          {/* Mobile Menu Toggle - visible only on md and down */}
          <div className="flex items-center gap-2 md:hidden">
            {user && (
              <Link to="/profile" className="p-2 text-text-dim hover:text-white">
                <Bookmark className="w-5 h-5" />
              </Link>
            )}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-text-main rounded-full bg-white/5"
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Search Bar - Hidden on small mobile in main row if cramped */}
        <div className="hidden md:flex relative flex-1 max-w-[480px] md:mx-10 group mt-3 md:mt-0 w-full">
          <Search className="absolute left-[14px] top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim group-focus-within:text-brand-primary transition-colors" />
          <input
            type="text"
            placeholder="Search moments..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full h-11 pl-11 pr-4 bg-card-dark border border-border-dark rounded-2xl text-text-main text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all"
          />
        </div>

        <div className="hidden md:flex items-center gap-2 md:gap-4">
          {/* Desktop Nav Items */}
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link to="/moderation" className="p-2.5 text-text-dim hover:text-white hover:bg-white/5 rounded-full transition-all" title="Moderation">
                <Shield className="w-5 h-5" />
              </Link>
            )}
            {user && (
              <Link to="/profile" className="p-2.5 text-text-dim hover:text-white hover:bg-white/5 rounded-full transition-all" title="My Collections">
                <Bookmark className="w-5 h-5" />
              </Link>
            )}
          </div>

          {user ? (
            <div className="relative">
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 pl-3 rounded-full border border-border-dark hover:border-brand-primary/50 transition-colors bg-card-dark group"
              >
                <span className="text-xs font-bold hidden lg:block group-hover:text-brand-primary transition-colors">{user.displayName || 'Account'}</span>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full border border-white/10" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </button>

              {userMenuOpen && (
                <div className="absolute top-14 right-0 w-56 bg-card-dark border border-border-dark rounded-2xl shadow-2xl py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 border-t-brand-primary border-t-2">
                  <div className="px-4 py-3 border-b border-white/5 mb-1 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white truncate">{user.displayName || 'User'}</p>
                      <p className="text-[10px] text-text-dim truncate">{user.email}</p>
                    </div>
                    {user.isAdmin ? (
                      <div className="p-1 px-2 bg-amber-500/10 text-amber-500 rounded-lg border border-amber-500/20" title="Sanctuary Architect">
                        <Shield className="w-3.5 h-3.5" />
                      </div>
                    ) : user.isPremium ? (
                      <div className="p-1 px-2 bg-brand-primary/10 text-brand-primary rounded-lg border border-brand-primary/20" title="Elite Curator">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                    ) : null}
                  </div>
                  <Link to="/profile" onClick={() => setUserMenuOpen(false)} className="px-4 py-2.5 hover:bg-white/5 flex items-center gap-3 text-sm transition-colors">
                    <UserCircle className="w-4 h-4 text-text-dim" /> Profile
                  </Link>
                  {onInstall && (
                    <button onClick={() => { onInstall(); setUserMenuOpen(false); }} className="w-full px-4 py-2.5 hover:bg-brand-primary/10 flex items-center gap-3 text-sm text-brand-primary transition-colors">
                      <Download className="w-4 h-4" /> Install Sanctuary
                    </button>
                  )}
                  <Link to="/developer" onClick={() => setUserMenuOpen(false)} className="px-4 py-2.5 hover:bg-white/5 flex items-center gap-3 text-sm transition-colors">
                    <Bookmark className="w-4 h-4 text-text-dim" /> Developer Profile
                  </Link>
                  {isAdmin && (
                    <>
                      <div className="px-4 py-2 text-[10px] font-extrabold uppercase tracking-widest text-brand-primary/60 border-t border-white/5 mt-2">Administrative Console</div>
                      <Link to="/admin" onClick={() => setUserMenuOpen(false)} className="px-4 py-2.5 hover:bg-white/5 flex items-center gap-3 text-sm text-brand-primary transition-colors">
                        <PlusCircle className="w-4 h-4" /> Asset Management
                      </Link>
                      <Link to="/moderation" onClick={() => setUserMenuOpen(false)} className="px-4 py-2.5 hover:bg-white/5 flex items-center gap-3 text-sm text-brand-primary transition-colors">
                        <Shield className="w-4 h-4" /> Moderation Hall
                      </Link>
                    </>
                  )}
                  <div className="border-t border-white/5 mt-1 pt-1">
                    <button onClick={onLogout} className="w-full px-4 py-2.5 hover:bg-red-500/10 flex items-center gap-3 text-sm text-red-400 transition-colors">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={onLogin}
              className="px-6 py-2.5 bg-brand-primary text-white font-bold rounded-full text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-primary/20"
            >
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Menu Overlay - Fully Immersive */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-bg-dark flex flex-col pt-4 animate-in fade-in slide-in-from-right-full duration-300">
          <div className="flex items-center justify-between px-6 pb-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <Logo size="md" />
              <span className="font-display font-black text-xl uppercase tracking-tight">Menu</span>
            </div>
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="p-3 rounded-full bg-white/5 text-text-main"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Search in Mobile Menu */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-text-dim px-2">Discovery</h4>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                <input
                  type="text"
                  placeholder="Seach sanctuary..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full h-14 pl-12 pr-4 bg-card-dark border border-border-dark rounded-2xl text-text-main text-lg focus:outline-none focus:ring-1 focus:ring-brand-primary transition-all"
                />
              </div>
            </div>

            <nav className="space-y-2">
              <h4 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-text-dim px-2">Navigation</h4>
              {onInstall && (
                <button onClick={() => { onInstall(); setMobileMenuOpen(false); }} className="w-full flex items-center justify-between px-5 py-4 bg-brand-primary/10 rounded-2xl border border-brand-primary/20 text-lg font-bold text-brand-primary animate-pulse">
                  Install App <span>✨</span>
                </button>
              )}
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between px-5 py-4 bg-white/5 rounded-2xl border border-white/5 text-lg font-bold hover:bg-white/10 transition-all">
                Home <span>→</span>
              </Link>
              {user && (
                <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between px-5 py-4 bg-white/5 rounded-2xl border border-white/5 text-lg font-bold hover:bg-white/10 transition-all">
                  My Sanctuary <span>→</span>
                </Link>
              )}
              <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between px-5 py-4 bg-white/5 rounded-2xl border border-white/5 text-lg font-bold hover:bg-white/10 transition-all">
                About <span>→</span>
              </Link>
              <Link to="/developer" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between px-5 py-4 bg-white/5 rounded-2xl border border-white/5 text-lg font-bold hover:bg-white/10 transition-all">
                The Architect <span>→</span>
              </Link>
            </nav>

            {isAdmin && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-brand-primary px-2">Divine Control</h4>
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between px-5 py-4 bg-brand-primary/10 rounded-2xl border border-brand-primary/20 text-lg font-bold text-brand-primary">
                  Asset Dashboard <span>⚙️</span>
                </Link>
                <Link to="/moderation" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-between px-5 py-4 bg-brand-primary/10 rounded-2xl border border-brand-primary/20 text-lg font-bold text-brand-primary">
                  Moderation Hall <span>⚖️</span>
                </Link>
              </div>
            )}

            {!user && (
              <button 
                onClick={() => { onLogin(); setMobileMenuOpen(false); }}
                className="w-full py-5 bg-white text-bg-dark font-black uppercase tracking-[0.2em] text-sm rounded-2xl shadow-xl active:scale-95 transition-all"
              >
                Sign In with Google
              </button>
            )}
          </div>

          {user && (
            <div className="p-6 border-t border-white/5 bg-card-dark">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full border border-white/10" />
                    {user.isAdmin ? (
                      <div className="absolute -bottom-1 -right-1 p-0.5 bg-amber-500 text-bg-dark rounded-full border border-bg-dark">
                        <Shield className="w-2.5 h-2.5" />
                      </div>
                    ) : user.isPremium ? (
                      <div className="absolute -bottom-1 -right-1 p-0.5 bg-brand-primary text-white rounded-full border border-bg-dark">
                        <Sparkles className="w-2.5 h-2.5" />
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white leading-tight">{user.displayName}</p>
                    <p className="text-[10px] text-text-dim uppercase tracking-wider font-bold">
                      {user.isAdmin ? 'Sanctuary Architect' : user.isPremium ? 'Elite Curator' : 'Resident'}
                    </p>
                  </div>
                </div>
                <button onClick={() => { onLogout(); setMobileMenuOpen(false); }} className="p-3 rounded-xl bg-red-500/10 text-red-400">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
