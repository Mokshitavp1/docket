import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  Search,
  X,
  CheckCheck,
  Clock,
  AlertCircle,
  Users,
  Calendar,
} from 'lucide-react';
import { useNotifications } from '../../hooks/useAuth';
import { Notification } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';

interface HeaderProps {
  onMenuClick: () => void;
}

// ─── Notification icon by type ────────────────────────────────────────────────
const NotificationIcon = ({ type }: { type: Notification['type'] }) => {
  const icons = {
    TASK_ASSIGNED: <CheckCheck className="w-4 h-4 text-primary-400" />,
    TASK_REMINDER: <Clock className="w-4 h-4 text-warning-400" />,
    TASK_UPDATED:  <AlertCircle className="w-4 h-4 text-slate-400" />,
    MEETING_STARTED: <Calendar className="w-4 h-4 text-success-400" />,
    MEETING_ENDED:   <Calendar className="w-4 h-4 text-slate-400" />,
    WORKSPACE_INVITE: <Users className="w-4 h-4 text-primary-400" />,
  };
  return icons[type] || <Bell className="w-4 h-4 text-slate-400" />;
};

// ─── Page title from path ─────────────────────────────────────────────────────
const getPageTitle = (pathname: string): string => {
  if (pathname === '/dashboard')          return 'Dashboard';
  if (pathname.startsWith('/workspaces') && pathname.split('/').length === 2)
                                          return 'Workspaces';
  if (pathname.includes('/workspaces/'))  return 'Workspace';
  if (pathname.includes('/meetings/new')) return 'New Meeting';
  if (pathname.includes('/review'))       return 'Review Meeting';
  if (pathname.includes('/meetings/'))    return 'Meeting';
  if (pathname === '/tasks')              return 'My Tasks';
  if (pathname === '/settings')           return 'Settings';
  return 'MeetingBrain';
};

export default function Header({ onMenuClick }: HeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const { notifications, unreadCount, markRead, markAllRead, isMarkingRead } =
    useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  const pageTitle = getPageTitle(location.pathname);

  const handleNotifClick = (notif: Notification) => {
    if (!notif.read) markRead([notif.id]);
    if (notif.link) navigate(notif.link);
    setNotifOpen(false);
  };

  const handleMarkAllRead = () => {
    markAllRead();
  };

  return (
    <header className="h-16 flex items-center justify-between px-4 lg:px-6
                        border-b border-dark-700 bg-dark-900 flex-shrink-0 z-30">
      {/* ── Left: hamburger + title ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="btn-icon lg:hidden text-slate-400 hover:text-slate-100"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-slate-100 tracking-tight">
          {pageTitle}
        </h1>
      </div>

      {/* ── Right: actions ── */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((prev) => !prev)}
            className={clsx(
              'btn-icon relative text-slate-400 hover:text-slate-100',
              notifOpen && 'bg-dark-700 text-slate-100'
            )}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4
                               flex items-center justify-center
                               rounded-full bg-primary-600 text-white text-2xs font-bold px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          <AnimatePresence>
            {notifOpen && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setNotifOpen(false)}
                />

                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 w-80 bg-dark-800 border border-dark-700
                             rounded-xl shadow-strong z-50 overflow-hidden"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3
                                  border-b border-dark-700">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-200">
                        Notifications
                      </h3>
                      {unreadCount > 0 && (
                        <span className="badge-primary text-2xs">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        disabled={isMarkingRead}
                        className="text-xs text-primary-400 hover:text-primary-300
                                   transition-colors disabled:opacity-50"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Notification list */}
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center
                                      py-10 text-center px-4">
                        <Bell className="w-8 h-8 text-dark-600 mb-2" />
                        <p className="text-sm text-slate-500">
                          No notifications yet
                        </p>
                      </div>
                    ) : (
                      <div>
                        {notifications.slice(0, 20).map((notif) => (
                          <button
                            key={notif.id}
                            onClick={() => handleNotifClick(notif)}
                            className={clsx(
                              'w-full flex items-start gap-3 px-4 py-3 text-left',
                              'hover:bg-dark-700/50 transition-colors',
                              'border-b border-dark-700/50 last:border-0',
                              !notif.read && 'bg-primary-900/10'
                            )}
                          >
                            {/* Icon */}
                            <div className={clsx(
                              'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5',
                              !notif.read ? 'bg-dark-700' : 'bg-dark-700/50'
                            )}>
                              <NotificationIcon type={notif.type} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <p className={clsx(
                                'text-sm truncate',
                                !notif.read
                                  ? 'text-slate-200 font-medium'
                                  : 'text-slate-400'
                              )}>
                                {notif.title}
                              </p>
                              <p className="text-xs text-slate-500 truncate mt-0.5">
                                {notif.message}
                              </p>
                              <p className="text-2xs text-slate-600 mt-1">
                                {formatDistanceToNow(new Date(notif.createdAt), {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>

                            {/* Unread dot */}
                            {!notif.read && (
                              <div className="w-2 h-2 rounded-full bg-primary-500
                                              flex-shrink-0 mt-2" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div className="border-t border-dark-700 px-4 py-2.5">
                      <button
                        onClick={() => setNotifOpen(false)}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}