import { NavLink, useLocation } from 'react-router-dom';
import { Bot, ClipboardList, Crosshair, MoreHorizontal, Ruler } from 'lucide-react';

const TABS = [
  { to: '/', label: 'GPS', icon: Crosshair, end: true },
  { to: '/bag', label: 'Bag', icon: Ruler },
  { to: '/caddie', label: 'Caddie', icon: Bot },
  { to: '/scorecard', label: 'Score', icon: ClipboardList },
  { to: '/more', label: 'More', icon: MoreHorizontal },
];

const MORE_PAGES = ['/more', '/rounds', '/swing', '/drills', '/course-lab', '/green-reader', '/tour-suite', '/shot-history', '/shot-studio', '/biometrics', '/pairing'];

export default function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Primary navigation"
      className="apex-bottom-nav glass-panel z-30 shrink-0 border-t px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {TABS.map(({ to, label, icon: Icon, end }) => {
          const moreSelected = to === '/more' && MORE_PAGES.some((page) =>
            pathname === page || pathname.startsWith(page + '/'),
          );
          return (
            <NavLink key={to} to={to} end={end}
              aria-label={label}
              className={({ isActive }) =>
                `flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-muted-foreground transition-colors ${isActive || moreSelected ? 'apex-nav-current' : 'hover:text-foreground'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`h-5 w-5 transition-transform ${isActive || moreSelected ? 'scale-110 drop-shadow-[0_0_8px_hsl(176_78%_43%/0.55)]' : ''}`} />
                  <span className="text-[11px] font-semibold tracking-wide">{label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
