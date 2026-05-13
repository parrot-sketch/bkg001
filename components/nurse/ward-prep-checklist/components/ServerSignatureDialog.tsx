'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ServerSignatureDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  defaultSignerName?: string;
  lockSignerName?: boolean;
  onSign: (args: { signerName: string }) => void | Promise<void>;
  disabled?: boolean;
}) {
  const { open, onOpenChange, title, defaultSignerName, lockSignerName, onSign, disabled } = props;
  const [signerName, setSignerName] = useState(defaultSignerName || '');
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setSignerName(defaultSignerName || '');
    setIsSigning(false);
    setError('');
  }, [open, defaultSignerName]);

  const canSign = useMemo(() => signerName.trim().length >= 2 && !disabled, [signerName, disabled]);

  const handleSign = async () => {
    if (!canSign) return;
    setIsSigning(true);
    setError('');
    try {
      await onSign({ signerName: signerName.trim() });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to sign');
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!disabled) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Full name</Label>
            <Input
              value={signerName}
              onChange={(e) => {
                if (lockSignerName) return;
                setSignerName(e.target.value);
              }}
              disabled={disabled || lockSignerName}
            />
            <p className="text-xs text-slate-500">
              Clicking “Sign” records your user ID, timestamp, and a tamper-evident hash for this document snapshot.
            </p>
          </div>
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={disabled || isSigning}>
            Cancel
          </Button>
          <Button onClick={handleSign} disabled={!canSign || isSigning} className="bg-slate-900 hover:bg-black">
            {isSigning ? 'Signing…' : 'Sign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
