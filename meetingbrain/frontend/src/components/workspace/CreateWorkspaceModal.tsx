import { useState } from 'react';
import { Building2, Loader2 } from 'lucide-react';
import Modal, { ModalBody, ModalFooter } from '../ui/Modal';
import { Input, Textarea } from '../ui/Input';
import Button from '../ui/Button';
import { useCreateWorkspace } from '../../hooks/useWorkspace';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateWorkspaceModal({
  isOpen,
  onClose,
}: CreateWorkspaceModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});

  const createWorkspace = useCreateWorkspace();

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = 'Workspace name is required.';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters.';
    } else if (name.trim().length > 100) {
      newErrors.name = 'Name must not exceed 100 characters.';
    }

    if (description.length > 500) {
      newErrors.description = 'Description must not exceed 500 characters.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await createWorkspace.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      handleClose();
    } catch {
      // Error handled by mutation
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Workspace"
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-4">
          {/* Icon preview */}
          <div className="flex items-center gap-4 p-4 bg-dark-700/50 rounded-xl
                          border border-dark-600">
            <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center
                            justify-center text-white text-xl font-bold flex-shrink-0">
              {name.trim() ? name.trim()[0].toUpperCase() : <Building2 className="w-6 h-6" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">
                {name.trim() || 'New Workspace'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {description.trim() || 'No description provided'}
              </p>
            </div>
          </div>

          {/* Name */}
          <Input
            label="Workspace Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            error={errors.name}
            placeholder="e.g. Product Team, Engineering, Marketing"
            required
            autoFocus
            maxLength={100}
          />

          {/* Description */}
          <div className="form-group">
            <label className="form-label">
              Description
              <span className="text-slate-500 font-normal ml-1">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description)
                  setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              placeholder="What is this workspace for?"
              rows={3}
              maxLength={500}
              className="form-textarea w-full"
            />
            <div className="flex items-center justify-between">
              {errors.description ? (
                <p className="form-error">{errors.description}</p>
              ) : (
                <span />
              )}
              <span className="text-xs text-slate-500 ml-auto">
                {description.length}/500
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="alert-info rounded-xl p-3">
            <p className="text-xs text-primary-300">
              💡 You'll be the admin of this workspace. You can invite team
              members after creating it.
            </p>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={createWorkspace.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={createWorkspace.isPending}
          >
            Create Workspace
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}