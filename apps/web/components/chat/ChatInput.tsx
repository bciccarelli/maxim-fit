'use client';

import { useState, useRef, useCallback } from 'react';
import { Send, ImagePlus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ImagePreview {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
}

interface ChatInputProps {
  onSubmit: (question: string, image?: { base64: string; mimeType: string }) => void;
  isStreaming: boolean;
  onImagePreviewUrl?: (url: string | null) => void;
}

const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3MB
const VALID_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function ChatInput({ onSubmit, isStreaming, onImagePreviewUrl }: ChatInputProps) {
  const [question, setQuestion] = useState('');
  const [image, setImage] = useState<ImagePreview | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setImageError(null);

    if (!VALID_TYPES.includes(file.type)) {
      setImageError('Use JPEG, PNG, GIF, or WebP images.');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setImageError('Image must be under 3MB.');
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1]; // Strip data URI prefix
      setImage({ file, previewUrl, base64, mimeType: file.type });
      onImagePreviewUrl?.(previewUrl);
    };
    reader.readAsDataURL(file);
  }, [onImagePreviewUrl]);

  const removeImage = useCallback(() => {
    if (image) {
      URL.revokeObjectURL(image.previewUrl);
    }
    setImage(null);
    setImageError(null);
    onImagePreviewUrl?.(null);
  }, [image, onImagePreviewUrl]);

  const handleSubmit = () => {
    if (!question.trim() || isStreaming) return;
    onSubmit(
      question.trim(),
      image ? { base64: image.base64, mimeType: image.mimeType } : undefined
    );
    setQuestion('');
    removeImage();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) processFile(file);
        return;
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    }
  };

  return (
    <div
      className="border-t p-3 space-y-2"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="border-2 border-dashed border-primary/40 rounded-lg p-4 text-center text-sm text-muted-foreground">
          Drop image here
        </div>
      )}

      {/* Image preview */}
      {image && (
        <div className="flex items-center gap-2">
          <div className="relative">
            <img
              src={image.previewUrl}
              alt="Upload preview"
              className="h-16 w-16 object-cover rounded-md border"
            />
            <button
              onClick={removeImage}
              className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {imageError && (
        <p className="text-xs text-destructive">{imageError}</p>
      )}

      <div className="flex items-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming}
        >
          <ImagePlus className="h-4 w-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
            e.target.value = '';
          }}
        />
        <Textarea
          placeholder="Ask about your protocol..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          rows={1}
          className="resize-none min-h-[40px] max-h-[120px]"
        />
        <Button
          size="icon"
          className="shrink-0"
          onClick={handleSubmit}
          disabled={!question.trim() || isStreaming}
        >
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
