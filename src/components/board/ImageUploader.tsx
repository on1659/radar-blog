"use client";

import { useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { MAX_IMAGE_BYTES } from "@/lib/board";
import type { ApiResponse, CommunityDict } from "@/types";

export interface UploadedImage {
  id: string;
  previewUrl: string;
}

const MAX_EDGE = 1600;

/** 원본을 canvas로 다운스케일(긴 변 1600px) 후 webp로 인코딩. 2MB 초과 시 품질을 낮춰 재시도. */
const processFile = async (
  file: File
): Promise<{ blob: Blob; width: number; height: number }> => {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const encode = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

  let blob = (await encode("image/webp", 0.85)) ?? (await encode("image/jpeg", 0.85));
  if (blob && blob.size > MAX_IMAGE_BYTES) {
    blob = (await encode("image/webp", 0.7)) ?? (await encode("image/jpeg", 0.7));
  }
  if (!blob || blob.size > MAX_IMAGE_BYTES) throw new Error("too-large");
  return { blob, width, height };
};

export const ImageUploader = ({
  dict,
  value,
  onChange,
}: {
  dict: CommunityDict;
  value: UploadedImage | null;
  onChange: (value: UploadedImage | null) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const { blob, width, height } = await processFile(file);
      const formData = new FormData();
      formData.append("file", blob, "image.webp");
      formData.append("width", String(width));
      formData.append("height", String(height));

      const res = await fetch("/api/board/images", { method: "POST", body: formData });
      const json = (await res.json()) as ApiResponse<{ id: string }>;
      if (!json.success || !json.data) {
        if (res.status === 429) setError(dict.errorRateLimited);
        else if (json.error === "GITHUB_LOGIN_REQUIRED") setError(dict.reLoginRequired);
        else setError(dict.errorGeneric);
        return;
      }
      onChange({ id: json.data.id, previewUrl: URL.createObjectURL(blob) });
    } catch {
      setError(dict.errorGeneric);
    } finally {
      setBusy(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file && !busy) void upload(file);
  };

  return (
    <div>
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-border bg-bg-secondary">
          <img src={value.previewUrl} alt="" className="max-h-[420px] w-full object-contain" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 rounded-md bg-black/60 px-2.5 py-1.5 text-xs text-white transition-colors hover:bg-black/75"
          >
            {dict.imageRemove}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-all duration-base ${
            dragOver
              ? "border-board-accent bg-board-accent-light text-text-secondary"
              : "border-border text-text-tertiary hover:border-board-accent hover:text-text-secondary"
          }`}
        >
          <ImagePlus size={20} />
          <span className="text-meta">{busy ? dict.uploading : dict.imageDropHint}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-2 text-meta text-[#EF4444]">{error}</p>}
    </div>
  );
};
