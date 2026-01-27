import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFilteredData } from '@/hooks/useFashionData';
import { useDashboardStore } from '@/store/dashboardStore';
import { useTranslation } from '@/hooks/useTranslation';
import { format } from 'date-fns';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export function AIChatWidget() {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { metrics, target } = useFilteredData();
  const { filters } = useDashboardStore();

  // Build data context for AI
  const dataContext = useMemo(() => {
    if (!metrics || metrics.length === 0) return 'No data available for the selected period.';
    
    const totals = metrics.reduce(
      (acc, m) => ({
        revenue: acc.revenue + m.totalRevenue,
        spend: acc.spend + m.totalSpend,
        orders: acc.orders + m.orders,
        webRevenue: acc.webRevenue + m.revenueWeb,
        appRevenue: acc.appRevenue + m.revenueApp,
        fbSpend: acc.fbSpend + m.spendFB,
        googleSpend: acc.googleSpend + m.spendGoogle,
        fbRevenue: acc.fbRevenue + (m.spendFB * m.roasFB),
        googleRevenue: acc.googleRevenue + (m.spendGoogle * m.roasGoogle),
      }),
      { revenue: 0, spend: 0, orders: 0, webRevenue: 0, appRevenue: 0, fbSpend: 0, googleSpend: 0, fbRevenue: 0, googleRevenue: 0 }
    );
    
    const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0;
    const aov = totals.orders > 0 ? totals.revenue / totals.orders : 0;
    const fbRoas = totals.fbSpend > 0 ? totals.fbRevenue / totals.fbSpend : 0;
    const googleRoas = totals.googleSpend > 0 ? totals.googleRevenue / totals.googleSpend : 0;
    
    const startDate = format(filters.dateRange.start, 'MMM d, yyyy');
    const endDate = format(filters.dateRange.end, 'MMM d, yyyy');
    const selectedLabels = filters.labels.length > 0 ? filters.labels.join(', ') : 'All brands';
    
    return `
Period: ${startDate} to ${endDate}
Selected Brands: ${selectedLabels}
Days in period: ${metrics.length}

Brand Aliases (user may use these shortcuts):
- FMH.NL = fashionmusthaves.nl
- FMH.BE = fashionmusthaves.be
- FMH.DE = fashionmusthaves.de
- JURK = jurkjes.com

Key Metrics:
- Total Revenue: €${totals.revenue.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}
- Total Spend: €${totals.spend.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}
- Orders: ${totals.orders.toLocaleString()}
- ROAS: ${roas.toFixed(2)}x (Target: ${target?.merTarget ? (1 / target.merTarget).toFixed(1) : 5}x)
- AOV: €${aov.toFixed(2)}

Channel Split:
- Web Revenue: €${totals.webRevenue.toLocaleString('nl-NL', { maximumFractionDigits: 0 })} (${totals.revenue > 0 ? ((totals.webRevenue / totals.revenue) * 100).toFixed(1) : 0}%)
- App Revenue: €${totals.appRevenue.toLocaleString('nl-NL', { maximumFractionDigits: 0 })} (${totals.revenue > 0 ? ((totals.appRevenue / totals.revenue) * 100).toFixed(1) : 0}%)

Marketing Platforms:
- Facebook: Spend €${totals.fbSpend.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}, ROAS ${fbRoas.toFixed(2)}x
- Google: Spend €${totals.googleSpend.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}, ROAS ${googleRoas.toFixed(2)}x

Monthly Target: €${target?.revenueTarget?.toLocaleString('nl-NL', { maximumFractionDigits: 0 }) || 'Not set'}
    `.trim();
  }, [metrics, filters, target]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ question: userMessage, context: dataContext }),
      });

      if (!resp.ok || !resp.body) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to get response');
      }

      // Stream the response
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let textBuffer = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                return updated;
              });
            }
          } catch {
            // Incomplete JSON, put it back
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: t.aiChat?.error || 'Failed to get response. Please try again.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="px-4 py-2"
          >
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            >
              <Bot className="w-5 h-5" />
              <span className="flex-1 text-left font-medium">{t.aiChat?.askAI || 'Ask AI'}</span>
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col flex-1 min-h-0 mx-4 my-2 bg-card border border-border rounded-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30 shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{t.aiChat?.askAI || 'Ask AI'}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsExpanded(false)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>

            {/* Messages - fills available space */}
            <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
              <div className="p-3 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    {t.aiChat?.placeholder || 'Ask about your data...'}
                  </p>
                ) : (
                  messages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        'text-xs rounded-lg px-3 py-2 max-w-[95%] whitespace-pre-wrap',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground ml-auto'
                          : 'bg-muted text-foreground'
                      )}
                    >
                      {msg.content || (isLoading && i === messages.length - 1 ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {t.aiChat?.thinking || 'Thinking...'}
                        </span>
                      ) : '')}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-2 border-t border-border flex gap-2 shrink-0">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.aiChat?.placeholder || 'Ask about your data...'}
                className="h-8 text-xs"
                disabled={isLoading}
              />
              <Button
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
