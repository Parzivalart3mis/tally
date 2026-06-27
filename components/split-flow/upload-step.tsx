'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2, ImageUp } from 'lucide-react';
import { EnginePicker } from '@/components/engine-picker/engine-picker';
import { ImageEditor } from '@/components/split-flow/image-editor';
import type { SplitEngineId } from '@/lib/types';

export function UploadStep({
  engine,
  onEngine,
  previewUrl,
  onFile,
  uploading,
  extracting,
}: {
  engine: SplitEngineId;
  onEngine: (e: SplitEngineId) => void;
  previewUrl: string | null;
  onFile: (file: File) => void;
  uploading: boolean;
  extracting: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [editorFiles, setEditorFiles] = useState<File[] | null>(null);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New bill</h1>
        <p className="text-sm text-text-muted">
          Photograph or pick a receipt. Crop, rotate, or add pages, then a model
          reads its items and totals.
        </p>
      </div>

      {editorFiles && (
        <ImageEditor
          files={editorFiles}
          onUse={(file) => {
            setEditorFiles(null);
            onFile(file);
          }}
          onCancel={() => setEditorFiles(null)}
        />
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="sr-only"
        onChange={(e) => {
          const fs = Array.from(e.target.files ?? []);
          if (fs.length) setEditorFiles(fs);
          e.target.value = '';
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || extracting}
        className="flex w-full flex-col items-center gap-3 rounded-card border-2 border-dashed border-border bg-surface/60 px-6 py-10 text-center transition-colors hover:border-accent hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Selected receipt"
            className="max-h-64 rounded-thumb border border-border object-contain"
          />
        ) : (
          <span className="grid size-14 place-items-center rounded-full bg-accent-soft text-accent">
            <Camera className="size-7" />
          </span>
        )}
        <span className="flex items-center gap-2 text-sm font-medium text-text">
          {uploading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Uploading…
            </>
          ) : extracting ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Reading the receipt…
            </>
          ) : previewUrl ? (
            <>
              <ImageUp className="size-4" /> Choose a different photo
            </>
          ) : (
            <>
              <ImageUp className="size-4" /> Take or choose a photo
            </>
          )}
        </span>
      </button>

      <div className="space-y-2">
        <p className="text-sm font-medium text-text">Split engine</p>
        <EnginePicker
          value={engine}
          onChange={onEngine}
          disabled={uploading || extracting}
        />
      </div>
    </div>
  );
}
