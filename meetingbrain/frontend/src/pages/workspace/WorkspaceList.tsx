import { useState } from 'react';
import { Plus, Building2, Search } from 'lucide-react';
import { useWorkspaces } from '../../hooks/useWorkspace';
import WorkspaceCard from '../../components/workspace/WorkspaceCard';
import CreateWorkspaceModal from '../../components/workspace/CreateWorkspaceModal';
import Button from '../../components/ui/Button';
import { CardSkeleton } from '../../components/ui/LoadingSpinner';
import { motion } from 'framer-motion';

export default function WorkspaceList() {
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { workspaces, isLoading } = useWorkspaces();

  const filtered = workspaces.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Workspaces</h1>
          <p className="page-subtitle">
            {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowCreate(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New Workspace
        </Button>
      </div>

      {/* ── Search ── */}
      {workspaces.length > 3 && (
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workspaces..."
            className="form-input pl-9 w-full max-w-sm"
          />
        </div>
      )}

      {/* ── Loading ── */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardSkeleton count={3} />
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && workspaces.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="empty-state"
        >
          <div className="empty-state-icon">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="empty-state-title">Create your first workspace</h3>
          <p className="empty-state-description">
            Workspaces are where your team collaborates. Create one to start
            holding AI-powered meetings.
          </p>
          <Button
            variant="primary"
            onClick={() => setShowCreate(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="mt-6"
          >
            Create Workspace
          </Button>
        </motion.div>
      )}

      {/* ── No results ── */}
      {!isLoading && workspaces.length > 0 && filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Search className="w-8 h-8" />
          </div>
          <h3 className="empty-state-title">No results found</h3>
          <p className="empty-state-description">
            No workspaces match "{searchQuery}"
          </p>
        </div>
      )}

      {/* ── Workspace grid ── */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((workspace, i) => (
            <WorkspaceCard key={workspace.id} workspace={workspace} index={i} />
          ))}

          {/* Add more card */}
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: filtered.length * 0.05 }}
            onClick={() => setShowCreate(true)}
            className="card border-dashed border-dark-600 hover:border-primary-600/50
                       hover:bg-primary-900/5 transition-all duration-200
                       flex flex-col items-center justify-center gap-3 p-8
                       text-slate-500 hover:text-primary-400 min-h-40 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl border-2 border-dashed border-current
                            flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Add Workspace</span>
          </motion.button>
        </div>
      )}

      {/* ── Create modal ── */}
      <CreateWorkspaceModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  );
}