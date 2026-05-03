import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Calendar,
  CheckSquare,
  Settings,
  LogOut,
  X,
  Brain,
  ChevronRight,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useAuth';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

interface SidebarProps {
  onClose?: () => void;
}

const navItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Workspaces',
    path: '/workspaces',
    icon: Building2,
  },
  {
    label: 'My Tasks',
    path: '/tasks',
    icon: CheckSquare,
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: Settings,
  },
];

export default function Sidebar({ onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { currentWorkspace } = useWorkspaceStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col h-full w-64 bg-dark-900 border-r border-dark-700">
      {/* ── Logo ── */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-dark-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow-sm flex-shrink-0">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-base font-bold text-slate-50 tracking-tight">
              MeetingBrain
            </span>
            <p className="text-2xs text-slate-500 -mt-0.5">AI Meeting Assistant</p>
          </div>
        </div>

        {/* Close button — mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden btn-icon text-slate-400 hover:text-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {/* Current workspace context */}
        {currentWorkspace && (
          <div className="mb-4">
            <p className="section-title px-3">Current Workspace</p>
            <button
              onClick={() => {
                navigate(`/workspaces/${currentWorkspace.id}`);
                onClose?.();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg
                         bg-dark-800 border border-dark-700 hover:border-dark-600
                         transition-colors group"
            >
              <div className="w-7 h-7 rounded-lg bg-primary-600/20 border border-primary-700/30
                              flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary-400">
                  {currentWorkspace.name[0].toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-slate-300 truncate flex-1 text-left">
                {currentWorkspace.name}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300
                                       transition-colors flex-shrink-0" />
            </button>
          </div>
        )}

        {/* Nav items */}
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/dashboard'
                ? location.pathname === '/dashboard'
                : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={clsx(
                  'nav-item relative',
                  isActive && 'nav-item-active'
                )}
              >
                <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                <span>{item.label}</span>

                {/* Notification badge on tasks */}
                {item.path === '/tasks' && unreadCount > 0 && (
                  <span className="ml-auto min-w-5 h-5 flex items-center justify-center
                                   rounded-full bg-primary-600 text-white text-2xs font-bold px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}

                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5
                               bg-primary-400 rounded-full"
                    transition={{ type: 'spring', duration: 0.3 }}
                  />
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* ── User profile ── */}
      <div className="border-t border-dark-700 p-3">
        {/* User info */}
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center
                          justify-center text-white text-xs font-bold flex-shrink-0">
            {user ? getInitials(user.name) : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate">
              {user?.name || 'Loading...'}
            </p>
            <p className="text-2xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg
                     text-sm font-medium text-slate-400 hover:text-danger-400
                     hover:bg-danger-900/20 transition-all duration-150"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}