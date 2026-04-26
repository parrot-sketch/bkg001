'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type SignatureValue = {
  signerName: string;
  signatureDataUrl: string;
  signedAt?: string;
};

function getCanvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * canvas.width;
  const y = ((clientY - rect.top) / rect.height) * canvas.height;
  return { x, y };
}

export function SignaturePadDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  defaultSignerName?: string;
  existing?: SignatureValue;
  onSave: (value: SignatureValue) => void | Promise<void>;
  disabled?: boolean;
}) {
  const { open, onOpenChange, title, defaultSignerName, existing, onSave, disabled } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawingRef = useRef(false);
  const [signerName, setSignerName] = useState(existing?.signerName || defaultSignerName || '');
  const [hasInk, setHasInk] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>('');

  const canSave = useMemo(() => signerName.trim().length >= 2 && hasInk, [signerName, hasInk]);

  useEffect(() => {
    if (!open) return;
    setSignerName(existing?.signerName || defaultSignerName || '');
    setHasInk(Boolean(existing?.signatureDataUrl));
    setIsSaving(false);
    setSaveError('');
  }, [open, existing?.signerName, existing?.signatureDataUrl, defaultSignerName]);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Retina-safe sizing
    const width = 720;
    const height = 220;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.0;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw existing signature preview into canvas (so edits are possible)
    if (existing?.signatureDataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      };
      img.src = existing.signatureDataUrl;
    }
  }, [open, existing?.signatureDataUrl]);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  };

  const start = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const p = getCanvasPoint(canvas, clientX, clientY);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    isDrawingRef.current = true;
  };

  const move = (clientX: number, clientY: number) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const p = getCanvasPoint(canvas, clientX, clientY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasInk(true);
  };

  const end = () => {
    isDrawingRef.current = false;
  };

  // Attach native listeners (including non-passive touchmove) to avoid
  // "Unable to preventDefault inside passive event listener" and ensure
  // the pad works on mobile Safari.
  useEffect(() => {
    if (!open || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      start(e.clientX, e.clientY);
    };
    const onPointerMove = (e: PointerEvent) => {
      e.preventDefault();
      move(e.clientX, e.clientY);
    };
    const onPointerUp = (e: PointerEvent) => {
      e.preventDefault();
      end();
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (!t) return;
      start(t.clientX, t.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      if (!t) return;
      move(t.clientX, t.clientY);
    };
    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      end();
    };

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      start(e.clientX, e.clientY);
    };
    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      move(e.clientX, e.clientY);
    };
    const onMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      end();
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);

    // Use non-passive listeners so preventDefault works for scroll blocking.
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerUp);

      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);

      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [open, disabled]);

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setIsSaving(true);
    setSaveError('');
    try {
      await onSave({
        signerName: signerName.trim(),
        signatureDataUrl: dataUrl,
        signedAt: new Date().toISOString(),
      });
      onOpenChange(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save signature');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!disabled) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-3xl rounded-3xl p-0 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-bold text-slate-900">{title}</DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</Label>
              <Input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Enter full name"
                disabled={disabled}
                className="rounded-xl"
              />
            </div>
            <div className="flex items-center justify-start sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={clear}
                disabled={disabled}
                className="rounded-xl gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <canvas
              ref={canvasRef}
              className="block w-full h-[220px] bg-white cursor-crosshair"
              style={{ touchAction: 'none' }}
            />
          </div>

          <p className="text-xs text-slate-500">
            Sign inside the box using a mouse or touchscreen.
          </p>
          {saveError ? <p className="text-xs text-red-600">{saveError}</p> : null}
        </div>

        <DialogFooter className="px-6 py-5 border-t border-slate-100 bg-slate-50/40">
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={disabled}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl bg-slate-900 hover:bg-black"
            onClick={handleSave}
            disabled={disabled || !canSave || isSaving}
          >
            {isSaving ? 'Saving…' : 'Save Signature'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
