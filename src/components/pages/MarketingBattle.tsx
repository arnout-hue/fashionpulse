import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Megaphone,
  Facebook,
  Chrome,
  DollarSign,
  MousePointer,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import { BentoCard } from '@/components/dashboard/BentoGrid';
import { StatusBadge } from '@/components/dashboard/MetricCard';
import { PlatformComparisonChart } from '@/components/charts/SmartTrendChart';
import { useFilteredData } from '@/hooks/useFashionData';
import { useTranslation } from '@/hooks/useTranslation';
import { 
  calculatePlatformComparison,
  formatCurrency,
  formatROAS,
} from '@/utils/analytics';
import { cn } from '@/lib/utils';

export function MarketingBattle() {
  const { metrics } = useFilteredData();
  const { t } = useTranslation();
  
  const platformData = useMemo(() => {
    return calculatePlatformComparison(metrics);
  }, [metrics]);
  
  const fbData = platformData.find(p => p.platform === 'facebook')!;
  const googleData = platformData.find(p => p.platform === 'google')!;
  
  const totalSpend = fbData.spend + googleData.spend;
  const fbShareOfSpend = totalSpend > 0 ? (fbData.spend / totalSpend) * 100 : 0;
  
  // Determine winner for each metric
  const roasWinner = fbData.roas > googleData.roas ? 'facebook' : 'google';
  const cpaWinner = fbData.cpa < googleData.cpa ? 'facebook' : 'google';
  const cpcWinner = fbData.cpc < googleData.cpc ? 'facebook' : 'google';
  
  return (
    <div className="p-8 space-y-6">
      {/* Platform Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Facebook Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bento-card border-l-4 border-l-platform-facebook"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-platform-facebook/10">
              <Facebook className="w-6 h-6 text-platform-facebook" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Meta Ads</h3>
              <p className="text-sm text-muted-foreground">Facebook & Instagram</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">{t.marketingBattle.spend}</span>
              <p className="text-2xl font-bold tabular-nums">
                {formatCurrency(fbData.spend, true)}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">{t.marketingBattle.attrRevenue}</span>
              <p className="text-2xl font-bold tabular-nums">
                {formatCurrency(fbData.revenue, true)}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">ROAS</span>
                {roasWinner === 'facebook' && (
                  <StatusBadge status="positive">{t.marketingBattle.winner}</StatusBadge>
                )}
              </div>
              <p className={cn(
                'text-2xl font-bold tabular-nums',
                roasWinner === 'facebook' ? 'text-profit' : ''
              )}>
                {formatROAS(fbData.roas)}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">CPA</span>
                {cpaWinner === 'facebook' && (
                  <StatusBadge status="positive">{t.marketingBattle.lower}</StatusBadge>
                )}
              </div>
              <p className={cn(
                'text-2xl font-bold tabular-nums',
                cpaWinner === 'facebook' ? 'text-profit' : ''
              )}>
                {formatCurrency(fbData.cpa)}
              </p>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {fbData.clicks.toLocaleString()} {t.marketingBattle.clicks}
                </span>
              </div>
              <span className="text-sm font-medium">
                CPC: {formatCurrency(fbData.cpc)}
              </span>
            </div>
          </div>
        </motion.div>
        
        {/* Google Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bento-card border-l-4 border-l-platform-google"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-platform-google/10">
              <Chrome className="w-6 h-6 text-platform-google" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Google Ads</h3>
              <p className="text-sm text-muted-foreground">Search & Shopping</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">{t.marketingBattle.spend}</span>
              <p className="text-2xl font-bold tabular-nums">
                {formatCurrency(googleData.spend, true)}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">{t.marketingBattle.attrRevenue}</span>
              <p className="text-2xl font-bold tabular-nums">
                {formatCurrency(googleData.revenue, true)}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">ROAS</span>
                {roasWinner === 'google' && (
                  <StatusBadge status="positive">{t.marketingBattle.winner}</StatusBadge>
                )}
              </div>
              <p className={cn(
                'text-2xl font-bold tabular-nums',
                roasWinner === 'google' ? 'text-profit' : ''
              )}>
                {formatROAS(googleData.roas)}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">CPA</span>
                {cpaWinner === 'google' && (
                  <StatusBadge status="positive">{t.marketingBattle.lower}</StatusBadge>
                )}
              </div>
              <p className={cn(
                'text-2xl font-bold tabular-nums',
                cpaWinner === 'google' ? 'text-profit' : ''
              )}>
                {formatCurrency(googleData.cpa)}
              </p>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {googleData.clicks.toLocaleString()} {t.marketingBattle.clicks}
                </span>
              </div>
              <span className="text-sm font-medium">
                CPC: {formatCurrency(googleData.cpc)}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
      
      {/* Comparison Chart */}
      <BentoCard
        title={t.marketingBattle.platformBattle}
        subtitle={t.marketingBattle.headToHead}
        icon={<Megaphone className="w-5 h-5" />}
      >
        <PlatformComparisonChart
          facebookData={fbData}
          googleData={googleData}
        />
        
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-platform-facebook" />
            <span className="text-sm text-muted-foreground">Meta Ads</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-platform-google" />
            <span className="text-sm text-muted-foreground">Google Ads</span>
          </div>
        </div>
      </BentoCard>
      
      {/* Budget Allocation */}
      <BentoCard
        title={t.marketingBattle.budgetAllocation}
        subtitle={t.marketingBattle.spendDistribution}
        icon={<DollarSign className="w-5 h-5" />}
      >
        <div className="space-y-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t.commandCenter.totalSpend}</p>
              <p className="text-3xl font-bold">{formatCurrency(totalSpend, true)}</p>
            </div>
          </div>
          
          {/* Split Bar */}
          <div className="relative h-6 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${fbShareOfSpend}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute inset-y-0 left-0 bg-platform-facebook"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${100 - fbShareOfSpend}%` }}
              transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
              className="absolute inset-y-0 right-0 bg-platform-google"
            />
          </div>
          
          <div className="flex justify-between">
            <div className="flex items-center gap-2">
              <Facebook className="w-4 h-4 text-platform-facebook" />
              <span className="text-sm font-medium">
                {fbShareOfSpend.toFixed(1)}%
              </span>
              <span className="text-sm text-muted-foreground">
                ({formatCurrency(fbData.spend, true)})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Chrome className="w-4 h-4 text-platform-google" />
              <span className="text-sm font-medium">
                {(100 - fbShareOfSpend).toFixed(1)}%
              </span>
              <span className="text-sm text-muted-foreground">
                ({formatCurrency(googleData.spend, true)})
              </span>
            </div>
          </div>
        </div>
      </BentoCard>
      
      {/* Efficiency Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bento-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-profit/10">
              <TrendingUp className="w-5 h-5 text-profit" />
            </div>
            <span className="font-medium">{t.marketingBattle.roasWinner}</span>
          </div>
          <div className="flex items-center gap-3">
            {roasWinner === 'facebook' ? (
              <Facebook className="w-8 h-8 text-platform-facebook" />
            ) : (
              <Chrome className="w-8 h-8 text-platform-google" />
            )}
            <div>
              <p className="text-2xl font-bold text-profit">
                {formatROAS(roasWinner === 'facebook' ? fbData.roas : googleData.roas)}
              </p>
              <p className="text-sm text-muted-foreground">
                {roasWinner === 'facebook' ? 'Meta Ads' : 'Google Ads'}
              </p>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bento-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-profit/10">
              <ShoppingBag className="w-5 h-5 text-profit" />
            </div>
            <span className="font-medium">{t.marketingBattle.bestCpa}</span>
          </div>
          <div className="flex items-center gap-3">
            {cpaWinner === 'facebook' ? (
              <Facebook className="w-8 h-8 text-platform-facebook" />
            ) : (
              <Chrome className="w-8 h-8 text-platform-google" />
            )}
            <div>
              <p className="text-2xl font-bold text-profit">
                {formatCurrency(cpaWinner === 'facebook' ? fbData.cpa : googleData.cpa)}
              </p>
              <p className="text-sm text-muted-foreground">
                {cpaWinner === 'facebook' ? 'Meta Ads' : 'Google Ads'}
              </p>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bento-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-profit/10">
              <MousePointer className="w-5 h-5 text-profit" />
            </div>
            <span className="font-medium">{t.marketingBattle.bestCpc}</span>
          </div>
          <div className="flex items-center gap-3">
            {cpcWinner === 'facebook' ? (
              <Facebook className="w-8 h-8 text-platform-facebook" />
            ) : (
              <Chrome className="w-8 h-8 text-platform-google" />
            )}
            <div>
              <p className="text-2xl font-bold text-profit">
                {formatCurrency(cpcWinner === 'facebook' ? fbData.cpc : googleData.cpc)}
              </p>
              <p className="text-sm text-muted-foreground">
                {cpcWinner === 'facebook' ? 'Meta Ads' : 'Google Ads'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
