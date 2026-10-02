import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, LogOut, User as UserIcon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, loginAsJudge } = useAuth();
  const location = useLocation();

  const navLinks = [
    { label: 'Overview', path: '/' },
    { label: 'Workspace', path: '/dashboard' },
  ];

  return (
    <header className="w-full bg-neutral-surface border-b-2 border-neutral-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Identity */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-primary text-primary-fg flex items-center justify-center font-bold text-lg border-2 border-neutral-ink">
              E
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight text-neutral-ink block leading-none">
                EPOCH
              </span>
              <span className="text-sm font-medium text-neutral-muted block">
                Hackathon Workspace
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 ml-6">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-2 text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-neutral-border text-neutral-ink font-semibold'
                      : 'text-neutral-ink hover:bg-neutral-bg'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Side: Auth & Judge Controls */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {user.isJudge ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-fg text-sm font-bold border border-neutral-ink">
                  <ShieldCheck className="w-4 h-4" />
                  <span>JUDGE MODE</span>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-neutral-bg border border-neutral-border text-sm font-medium text-neutral-ink">
                  <UserIcon className="w-4 h-4 text-neutral-muted" />
                  <span>{user.displayName || user.email}</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => logout()}
                className="flex items-center gap-2 px-4 py-2 text-base font-medium text-neutral-ink bg-neutral-surface border-2 border-neutral-border hover:bg-neutral-bg active:translate-x-0.5 active:translate-y-0.5"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {/* Immediate Judge Mode Button */}
              <button
                type="button"
                onClick={loginAsJudge}
                className="flex items-center gap-1.5 px-4 py-2 bg-secondary text-secondary-fg text-base font-bold border-2 border-neutral-ink shadow-hard hover:bg-secondary-hover active:translate-x-0.5 active:translate-y-0.5"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>Judge Login</span>
              </button>

              <Link
                to="/login"
                className="px-4 py-2 bg-primary text-primary-fg text-base font-medium border-2 border-neutral-ink hover:bg-primary-hover active:translate-x-0.5 active:translate-y-0.5"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
