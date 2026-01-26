import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, ExternalLink, Check } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { toast } from '@/hooks/use-toast';

interface SettingsDialogProps {
  trigger?: React.ReactNode;
}

export function SettingsDialog({ trigger }: SettingsDialogProps) {
  const { googleSheetId, setGoogleSheetId } = useDashboardStore();
  const [sheetId, setSheetId] = useState(googleSheetId || '');
  const [open, setOpen] = useState(false);

  const handleSave = () => {
    setGoogleSheetId(sheetId || null);
    toast({
      title: sheetId ? 'Google Sheet Connected' : 'Using Mock Data',
      description: sheetId 
        ? 'Your dashboard will now fetch live data from your sheet.'
        : 'Disconnected from Google Sheet, using demo data.',
    });
    setOpen(false);
  };

  const extractSheetId = (input: string): string => {
    // Handle full URLs like https://docs.google.com/spreadsheets/d/SHEET_ID/edit
    const match = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : input;
  };

  const handleInputChange = (value: string) => {
    setSheetId(extractSheetId(value.trim()));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <Settings className="w-5 h-5" />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Data Source Settings</DialogTitle>
          <DialogDescription>
            Your data is fetched securely via a server-side proxy. The fallback Sheet ID is only used if the proxy is unavailable.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label htmlFor="sheet-id">Google Sheet ID or URL</Label>
            <Input
              id="sheet-id"
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              value={sheetId}
              onChange={(e) => handleInputChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Paste the full sheet URL or just the ID from the URL.
            </p>
          </div>
          
          {/* Instructions */}
          <div className="rounded-lg bg-secondary p-4 space-y-3">
            <p className="text-sm font-medium">Sheet Requirements:</p>
            <ul className="text-xs text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <Check className="w-3 h-3 mt-0.5 text-profit" />
                <span><strong>Share as:</strong> "Anyone with the link can view" (no need to Publish to Web)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3 h-3 mt-0.5 text-profit" />
                <span><strong>Tab names:</strong> Must be exactly <code className="bg-muted px-1 rounded">Daily_Input</code> and optionally <code className="bg-muted px-1 rounded">Targets</code></span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3 h-3 mt-0.5 text-profit" />
                <span><strong>Headers:</strong> Date, Label, Rev_Web, Rev_App, Orders, Orders_App, Conv_FB, Conv_Google, Spend_FB, Spend_Google</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3 h-3 mt-0.5 text-profit" />
                <span><strong>Format:</strong> European dates (d-m-yyyy), decimals with comma (e.g., 1633,5)</span>
              </li>
            </ul>
            <a 
              href="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              View template <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          
          {/* Current Status */}
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${googleSheetId ? 'bg-profit' : 'bg-muted-foreground'}`} />
            <span className="text-muted-foreground">
              {googleSheetId ? `Connected: ${googleSheetId.slice(0, 20)}...` : 'Using mock data'}
            </span>
          </div>
        </div>
        
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => { setSheetId(''); handleSave(); }}>
            Use Demo Data
          </Button>
          <Button onClick={handleSave}>
            Save & Connect
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
