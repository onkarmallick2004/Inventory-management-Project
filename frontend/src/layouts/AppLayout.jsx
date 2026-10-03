// Shell for logged-in pages: dark sidebar on desktop, top bar + slide-out menu on phones.
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { label } from '../utils/format';

const NAV = {
  ADMIN: [
    { to: '/admin', text: 'Dashboard', end: true },
    { to: '/admin/requests', text: 'Service requests' },
    { to: '/admin/jobs', text: 'Service jobs' },
    { to: '/admin/machines', text: 'Machines' },
    { to: '/admin/parts', text: 'Parts inventory' },
    { to: '/admin/customers', text: 'Customers' },
    { to: '/selector', text: 'Product selector' },
  ],
  TECHNICIAN: [{ to: '/tech', text: 'My jobs', end: true }],
  CUSTOMER: [
    { to: '/portal', text: 'My machines', end: true },
    { to: '/portal/requests', text: 'My requests' },
    { to: '/selector', text: 'Product selector' },
  ],
};

export function Logo({ light = false }) {
  return (
    <div className="flex items-center gap-2">
      <img src="/favicon.svg" alt="" className="h-8 w-8" />
      <div className="leading-tight">
        <p className={`font-bold ${light ? 'text-white' : 'text-slate-900'}`}>ServiceDesk</p>
        <p className={`text-[11px] ${light ? 'text-slate-400' : 'text-slate-500'}`}>Compressors & Vacuum Pumps</p>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const links = NAV[user.role] || [];

  const nav = (
    <nav className="flex flex-col gap-1">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.end}
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) =>
            `rounded-md px-3 py-2 text-sm font-medium ${isActive ? 'bg-brand-500 text-slate-900' : 'text-slate-300 hover:bg-steel-800 hover:text-white'}`
          }
        >
          {l.text}
        </NavLink>
      ))}
    </nav>
  );

  const userBox = (
    <div className="border-t border-slate-700 pt-4 text-sm">
      <p className="font-medium text-white">{user.name}</p>
      <p className="text-xs text-slate-400">{label(user.role)}</p>
      <button
        onClick={() => {
          logout();
          navigate('/login');
        }}
        className="mt-3 text-xs font-medium text-brand-500 hover:underline"
      >
        Sign out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col justify-between bg-steel-900 p-4 lg:flex">
        <div className="space-y-6">
          <Logo light />
          {nav}
        </div>
        {userBox}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-steel-900 px-4 py-3 lg:hidden">
        <Logo light />
        <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-md p-2 text-white" aria-label="Menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d={menuOpen ? 'M6 6l12 12M18 6L6 18' : 'M4 6h16M4 12h16M4 18h16'} />
          </svg>
        </button>
      </header>
      {menuOpen && <div className="space-y-4 bg-steel-900 px-4 pb-4 lg:hidden">{nav}{userBox}</div>}

      <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}
