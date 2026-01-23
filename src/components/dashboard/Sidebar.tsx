import React from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Megaphone, 
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiveIndicator } from './MetricCard';
import { SettingsDialog } from './SettingsDialog';
import { LanguageToggle } from './LanguageToggle';
import { useTranslation } from '@/hooks/useTranslation';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function DashboardSidebar({ currentPage, onNavigate }: SidebarProps) {
  const { t } = useTranslation();
  
  const navItems = [
    { id: 'dashboard', label: t.sidebar.commandCenter, icon: LayoutDashboard },
    { id: 'revenue', label: t.sidebar.revenueAnalysis, icon: TrendingUp },
    { id: 'marketing', label: t.sidebar.marketingBattle, icon: Megaphone },
  ];

  return (
    <aside className="w-56 bg-card border-r border-border flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gauge-revenue flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-foreground">{t.sidebar.title}</h1>
            <p className="text-xs text-muted-foreground">{t.sidebar.subtitle}</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          const Icon = item.icon;
          
          return (
            <motion.button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors',
                isActive 
                  ? 'bg-accent text-accent-foreground font-medium' 
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-4 h-4" />}
            </motion.button>
          );
        })}
      </nav>
      
      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between px-4 py-2">
          <LiveIndicator />
          <div className="flex items-center gap-1">
            <LanguageToggle />
            <SettingsDialog />
          </div>
        </div>
      </div>
    </aside>
  );
}
