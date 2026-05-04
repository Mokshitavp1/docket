import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, Mail, Lock, User, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { register, isRegistering } = useAuth();

  // ── Password strength ──────────────────────────────────────────────────────
  const passwordChecks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'One uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', pass: /[a-z]/.test(password) },
    { label: 'One number', pass: /\d/.test(password) },
  ];
  const passwordStrength = passwordChecks.filter((c) => c.pass).length;

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-danger-500';
    if (passwordStrength <= 2) return 'bg-warning-500';
    if (passwordStrength <= 3) return 'bg-primary-500';
    return 'bg-success-500';
  };

  const getStrengthLabel = () => {
    if (!password) return '';
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength <= 2) return 'Fair';
    if (passwordStrength <= 3) return 'Good';
    return 'Strong';
  };

  // ── Validate ───────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required.';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters.';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password =
        'Password must contain uppercase, lowercase, and a number.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    register({ name: name.trim(), email: email.trim(), password, confirmPassword });
  };

  const clearError = (field: string) =>
    setErrors((prev) => ({ ...prev, [field]: '' }));

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96
                        bg-primary-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center
                          justify-center shadow-glow">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              MeetingBrain
            </h1>
            <p className="text-sm text-slate-400">Start your free account</p>
          </div>
        </div>

        {/* Card */}
        <div className="card p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-100">
              Create your account
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Free forever. No credit card required.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <Input
              label="Full Name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); clearError('name'); }}
              error={errors.name}
              placeholder="John Smith"
              leftIcon={<User className="w-4 h-4" />}
              autoComplete="name"
              autoFocus
              required
            />

            {/* Email */}
            <Input
              label="Work Email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError('email'); }}
              error={errors.email}
              placeholder="you@company.com"
              leftIcon={<Mail className="w-4 h-4" />}
              autoComplete="email"
              required
            />

            {/* Password */}
            <div className="space-y-2">
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError('password'); }}
                error={errors.password}
                placeholder="Create a strong password"
                leftIcon={<Lock className="w-4 h-4" />}
                autoComplete="new-password"
                required
              />

              {/* Strength indicator */}
              {password && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 grid grid-cols-4 gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={clsx(
                            'h-1 rounded-full transition-colors duration-300',
                            i < passwordStrength
                              ? getStrengthColor()
                              : 'bg-dark-600'
                          )}
                        />
                      ))}
                    </div>
                    <span className={clsx(
                      'text-xs font-medium w-12 text-right',
                      passwordStrength <= 1 ? 'text-danger-400' :
                      passwordStrength <= 2 ? 'text-warning-400' :
                      passwordStrength <= 3 ? 'text-primary-400' :
                      'text-success-400'
                    )}>
                      {getStrengthLabel()}
                    </span>
                  </div>

                  {/* Checks */}
                  <div className="grid grid-cols-2 gap-1">
                    {passwordChecks.map((check) => (
                      <div
                        key={check.label}
                        className={clsx(
                          'flex items-center gap-1.5 text-2xs',
                          check.pass ? 'text-success-400' : 'text-slate-500'
                        )}
                      >
                        <Check className={clsx(
                          'w-2.5 h-2.5 flex-shrink-0',
                          check.pass ? 'text-success-400' : 'text-dark-600'
                        )} />
                        {check.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearError('confirmPassword');
              }}
              error={errors.confirmPassword}
              placeholder="Repeat your password"
              leftIcon={<Lock className="w-4 h-4" />}
              autoComplete="new-password"
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              loading={isRegistering}
              size="lg"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Create Account
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="divider" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                             bg-dark-800 px-3 text-xs text-slate-500">
              or
            </span>
          </div>

          {/* Login link */}
          <p className="text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-primary-400 hover:text-primary-300 font-semibold
                         transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Terms */}
        <p className="text-center text-xs text-slate-600 mt-4">
          By creating an account, you agree to our{' '}
          <span className="text-slate-500 hover:text-slate-400 cursor-pointer">
            Terms of Service
          </span>{' '}
          and{' '}
          <span className="text-slate-500 hover:text-slate-400 cursor-pointer">
            Privacy Policy
          </span>
        </p>
      </motion.div>
    </div>
  );
}