import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface BentoCardProps {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  variant?: 'default' | 'hero' | 'small';
}

export function BentoCard({
  title,
  subtitle,
  className,
  children,
  icon,
  action,
  variant = 'default',
}: BentoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        variant === 'hero' ? 'bento-card-hero' : 
        variant === 'small' ? 'bento-card-sm' : 
        'bento-card',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2 rounded-lg bg-accent text-accent-foreground">
              {icon}
            </div>
          )}
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      {children}
    </motion.div>
  );
}

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4 auto-rows-min',
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {children}
    </div>
  );
}

// Grid span utilities
export const gridSpans = {
  hero: 'lg:col-span-2 lg:row-span-2',
  wide: 'lg:col-span-2',
  tall: 'lg:row-span-2',
  full: 'lg:col-span-4',
  medium: 'lg:col-span-1',
} as const;
