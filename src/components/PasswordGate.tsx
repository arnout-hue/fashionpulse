import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/hooks/useTranslation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PasswordGateProps {
  children: React.ReactNode;
}

export function PasswordGate({ children }: PasswordGateProps) {
  const { isAuthenticated, authenticate } = useAuthStore();
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  if (isAuthenticated) {
    return <>{children}</>;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const success = authenticate(password);
    if (!success) {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div
        className={cn(
          "w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700",
          shake && "animate-shake"
        )}
      >
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-600/20 mb-4">
            <Lock className="w-8 h-8 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Fashion Pulse</h1>
          <p className="text-slate-400 text-sm">{t.sidebar.subtitle}</p>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-300">
              {t.passwordGate.enterPassword}
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                onKeyDown={handleKeyDown}
                placeholder="••••••••"
                className={cn(
                  "bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 pr-10",
                  error && "border-red-500 focus-visible:ring-red-500"
                )}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <p className="text-red-400 text-sm">{t.passwordGate.incorrectPassword}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
          >
            {t.passwordGate.accessDashboard}
          </Button>
        </form>
      </div>

      {/* Shake animation styles */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
      `}</style>
    </div>
  );
}
