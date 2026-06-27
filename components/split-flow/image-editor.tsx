'use client';

import { useEffect, useRef, useState } from 'react';
import {
  RotateCw,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Crop,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Page {
  id: string;
  img: HTMLImageElement;
  url: string;
  rotation: number;
}
type Rect = { x: number; y: number; w: number; h: number }; // fractions 0..1

const TARGET_W = 1000;

/** Render one image rotated (0/90/180/270) and scaled to a target width. */
function rotatedCanvas(
  img: HTMLImageElement,
  rotation: number,
  targetW: number,
): HTMLCanvasElement {
  const swap = rotation % 180 !== 0;
  const natW = img.naturalWidth;
  const natH = img.naturalHeight;
  const rotW = swap ? natH : natW;
  const rotH = swap ? natW : natH;
  const scale = targetW / rotW;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(rotW * scale));
  c.height = Math.max(1, Math.round(rotH * scale));
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -natW / 2, -natH / 2);
  }
  return c;
}

export function ImageEditor({
  files,
  onUse,
  onCancel,
}: {
  files: File[];
  onUse: (file: File) => void;
  onCancel: () => void;
}) {
  const [pages, setPages] = useState<Page[]>([]);
  const [crop, setCrop] = useState<Rect | null>(null);
  const [drag, setDrag] = useState<Rect | null>(null);
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  async function load(fs: File[]) {
    const loaded = await Promise.all(
      fs.map(
        (f) =>
          new Promise<Page>((res, rej) => {
            const url = URL.createObjectURL(f);
            const img = new Image();
            img.onload = () =>
              res({
                id: Math.random().toString(36).slice(2),
                img,
                url,
                rotation: 0,
              });
            img.onerror = rej;
            img.src = url;
          }),
      ),
    );
    setPages((p) => [...p, ...loaded]);
  }

  // load the initial files once
  useEffect(() => {
    void load(files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildComposite(applyCrop: boolean): HTMLCanvasElement {
    const cans = pages.map((p) => rotatedCanvas(p.img, p.rotation, TARGET_W));
    const totalH = cans.reduce((s, c) => s + c.height, 0) || 1;
    const comp = document.createElement('canvas');
    comp.width = TARGET_W;
    comp.height = totalH;
    const ctx = comp.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, comp.width, comp.height);
      let y = 0;
      for (const c of cans) {
        ctx.drawImage(c, 0, y);
        y += c.height;
      }
    }
    if (applyCrop && crop && crop.w > 0.02 && crop.h > 0.02) {
      const cx = Math.round(crop.x * comp.width);
      const cy = Math.round(crop.y * comp.height);
      const cw = Math.round(crop.w * comp.width);
      const ch = Math.round(crop.h * comp.height);
      const out = document.createElement('canvas');
      out.width = cw;
      out.height = ch;
      out.getContext('2d')?.drawImage(comp, cx, cy, cw, ch, 0, 0, cw, ch);
      return out;
    }
    return comp;
  }

  // redraw the preview whenever pages/rotations change
  useEffect(() => {
    if (pages.length === 0) return;
    const comp = buildComposite(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = comp.width;
    canvas.height = comp.height;
    canvas.getContext('2d')?.drawImage(comp, 0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages]);

  const rotate = (id: string) =>
    setPages((ps) =>
      ps.map((p) =>
        p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p,
      ),
    );
  const remove = (id: string) =>
    setPages((ps) => ps.filter((p) => p.id !== id));
  const move = (id: string, dir: -1 | 1) =>
    setPages((ps) => {
      const i = ps.findIndex((p) => p.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ps.length) return ps;
      const next = [...ps];
      const a = next[i]!;
      next[i] = next[j]!;
      next[j] = a;
      return next;
    });

  // crop drag (fractions relative to the displayed canvas)
  function frac(e: React.PointerEvent, el: HTMLElement) {
    const r = el.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  }
  function onDown(e: React.PointerEvent) {
    const p = frac(e, e.currentTarget as HTMLElement);
    start.current = p;
    setDrag({ x: p.x, y: p.y, w: 0, h: 0 });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    if (!start.current) return;
    const p = frac(e, e.currentTarget as HTMLElement);
    const s = start.current;
    setDrag({
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      w: Math.abs(p.x - s.x),
      h: Math.abs(p.y - s.y),
    });
  }
  function onUp() {
    if (drag && drag.w > 0.03 && drag.h > 0.03) setCrop(drag);
    start.current = null;
    setDrag(null);
  }

  function use() {
    if (pages.length === 0) return;
    setBusy(true);
    const comp = buildComposite(true);
    comp.toBlob(
      (blob) => {
        if (!blob) {
          setBusy(false);
          return;
        }
        onUse(new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.9,
    );
  }

  const box = drag ?? crop;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <div className="safe-top flex items-center justify-between border-b border-border px-4 py-3">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <p className="text-sm font-medium text-text">Edit receipt</p>
        <Button size="sm" onClick={use} disabled={busy || pages.length === 0}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Use
        </Button>
      </div>

      <div className="safe-x flex-1 overflow-y-auto px-4 py-4">
        {/* Preview with crop overlay */}
        <div className="relative mx-auto max-w-md">
          <canvas
            ref={canvasRef}
            className="w-full touch-none rounded-thumb border border-border"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
          />
          {box && (
            <div
              className="pointer-events-none absolute border-2 border-accent bg-accent/10"
              style={{
                left: `${box.x * 100}%`,
                top: `${box.y * 100}%`,
                width: `${box.w * 100}%`,
                height: `${box.h * 100}%`,
              }}
            />
          )}
        </div>

        <p className="mt-2 text-center text-xs text-text-muted">
          Drag on the image to crop.{' '}
          {crop && (
            <button
              type="button"
              className="text-accent underline"
              onClick={() => setCrop(null)}
            >
              Reset crop
            </button>
          )}
        </p>

        {/* Page list */}
        <div className="mt-4 space-y-2">
          {pages.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-card border border-border bg-surface p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={`Page ${i + 1}`}
                className="size-12 rounded object-cover"
                style={{ transform: `rotate(${p.rotation}deg)` }}
              />
              <span className="flex-1 text-sm text-text-muted">
                Page {i + 1}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Move up"
                onClick={() => move(p.id, -1)}
                disabled={i === 0}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Move down"
                onClick={() => move(p.id, 1)}
                disabled={i === pages.length - 1}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Rotate"
                onClick={() => rotate(p.id)}
              >
                <RotateCw className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove page"
                onClick={() => remove(p.id)}
              >
                <Trash2 className="size-4 text-text-muted" />
              </Button>
            </div>
          ))}
        </div>

        <input
          ref={addRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            const fs = Array.from(e.target.files ?? []);
            if (fs.length) void load(fs);
            e.target.value = '';
          }}
        />
        <Button
          variant="secondary"
          className="mt-3 w-full"
          onClick={() => addRef.current?.click()}
        >
          <Plus className="size-4" />
          Add another photo
        </Button>
        <p className="mt-2 flex items-center justify-center gap-1 text-center text-xs text-text-hint">
          <Crop className="size-3" />
          Pages stack top to bottom — good for long receipts.
        </p>
      </div>
    </div>
  );
}
