import { NavLink } from 'react-router-dom';
import { Bot, ClipboardList, Crosshair, History, PersonStanding, Ruler } from 'lucide-react';

const TABS = [
  { to: '/', label: 'GPS', icon: Crosshair, end: true },
  { to: '/bag', label: 'Bag', icon: Ruler },
  { to: '/caddie', label: 'Caddie', icon: Bot },
  { to: '/scorecard', label: 'Score', icon: ClipboardList },
  { to: '/rounds', label: 'Rounds', icon: History },
  { to: '/swing', label: 'Swing', icon: PersonStanding },
];

export default function BottomNav() {
  return (
    <nav className="apex-bottom-nav glass-panel z-30 shrink-0 border-t px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
      <div className="mx-auto grid max-w-md grid-cols-6 gap-1">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-muted-foreground transition-colors ${
                isActive ? 'apex-nav-current' : 'hover:text-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`h-5 w-5 transition-transform ${isActive ? 'scale-110 drop-shadow-[0_0_8px_hsl(176_78%_43%/0.55)]' : ''}`} />
                <span className="text-[10px] font-medium tracking-wide">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}