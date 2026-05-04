import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  Calendar,
  ChevronRight,
  Crown,
  MoreVertical,
  Trash2,
  Settings,
} from 'lucide-react';
import { Workspace } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useDeleteWorkspace } from '../../hooks/useWorkspace';
import { useState, useRef, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface WorkspaceCardProps {
  workspace: Workspace;
  index?: number;
}

export default function WorkspaceCard({
  workspace,
  index = 0,
}: WorkspaceCardProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const deleteWorkspace = useDeleteWorkspace();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOwner = workspace.ownerId === user?.id;
  const memberCount = workspace._count.members;
  const meetingCount = workspace._count.meetings;

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      window.confirm(
        `Are you sure you want to delete "${workspace.name}"? This will delete all meetings and tasks.`
      )
    ) {
      deleteWorkspace.mutate(workspace.id);
    }
    setMenuOpen(false);
  };

  const handleCardClick = () => {
    navigate(`/workspaces/${workspace.id}`);
  };

  // Generate a consistent color from workspace name
  const colors = [
    'from-blue-600 to-blue-700',
    'from-violet-600 to-violet-700',
    'from-emerald-600 to-emerald-700',
    'from-orange-600 to-orange-700',
    'from-rose-600 to-rose-700',
    'from-cyan-600 to-cyan-700',
  ];
  const colorIndex =
    workspace.name.charCodeAt(0) % colors.length;
  const gradientColor = colors[colorIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={handleCardClick}
      className="card-hover p-5 group cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Icon */}
        <div
          className={clsx(
            'w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center',
            'text-white font-bold text-lg flex-shrink-0 shadow-sm',
            gradientColor
          )}
        >
          {workspace.name[0].toUpperCase()}
        </div>

        {/* Menu */}
        <div ref={menuRef} className="relative flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            className="btn-icon text-slate-500 hover:text-slate-200
                       opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 top-9 w-44 bg-dark-800 border border-dark-700
                          rounded-xl shadow-strong z-10 overflow-hidden py-1"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/workspaces/${workspace.id}`);
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm
                           text-slate-300 hover:bg-dark-700 hover:text-slate-100
                           transition-colors"
              >
                <Settings className="w-4 h-4" />
                Manage Workspace
              </button>

              {isOwner && (
                <button
                  onClick={handleDelete}
                  disabled={deleteWorkspace.isPending}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm
                             text-danger-400 hover:bg-danger-900/20
                             transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Workspace
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Name & description */}
      <div className="mt-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-slate-100 truncate group-hover:text-white
                          transition-colors">
            {workspace.name}
          </h3>
          {isOwner && (
            <Crown className="w-3.5 h-3.5 text-warning-400 flex-shrink-0" />
          )}
        </div>
        {workspace.description && (
          <p className="text-sm text-slate-400 mt-1 line-clamp-2">
            {workspace.description}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-dark-700">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Users className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <Calendar className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">
            {meetingCount} {meetingCount === 1 ? 'meeting' : 'meetings'}
          </span>
        </div>
        <div className="ml-auto">
          <ChevronRight
            className="w-4 h-4 text-slate-600 group-hover:text-slate-400
                        group-hover:translate-x-0.5 transition-all"
          />
        </div>
      </div>

      {/* Owner info */}
      <div className="flex items-center gap-2 mt-3">
        <div className="w-5 h-5 rounded-full bg-gradient-brand flex items-center
                        justify-center text-white text-2xs font-bold flex-shrink-0">
          {workspace.owner.name[0].toUpperCase()}
        </div>
        <span className="text-xs text-slate-500">
          {isOwner ? 'Created by you' : `Created by ${workspace.owner.name}`}
          {' · '}
          {formatDistanceToNow(new Date(workspace.createdAt), {
            addSuffix: true,
          })}
        </span>
      </div>
    </motion.div>
  );
}