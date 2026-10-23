import { NavLink, useLocation } from 'react-router-dom';
import { ClipboardList, Crosshair, House, LayoutGrid } from 'lucide-react';

const TABS = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/play', label: 'Play', icon: Crosshair },
  { to: '/scorecard', label: 'Score', icon: ClipboardList },
  { to: '/more', label: 'Tools', icon: LayoutGrid },
];

const TOOL_PAGES = ['/more', '/bag', '/caddie', '/rounds', '/swing', '/drills', '/course-lab', '/green-reader', '/tour-suite', '/shot-history', '/shot-studio', '/biometrics', '/pairing'];

export default function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Primary navigation" className="apex-bottom-nav glass-panel z-30 shrink-0 border-t px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
        {TABS.map(({ to, label, icon: Icon, end }) => {
          const toolsSelected = to === '/more' && TOOL_PAGES.some((page) =>
            pathname === page || pathname.startsWith(page + '/')
          );
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              aria-label={label}
              className={({ isActive }) =>
                'flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 font-semibold transition-colors ' +
                (isActive || toolsSelected ? 'apex-nav-current' : 'text-muted-foreground hover:text-foreground')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={'h-5 w-5 ' + (isActive || toolsSelected ? 'drop-shadow-[0_0_8px_rgba(0,216,232,.4)]' : '')} aria-hidden="true" />
                  <span className="text-[11px] tracking-wide">{label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
