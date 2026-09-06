import * as React from "react";
import { cn } from "@/lib/utils";
import { Upload, X, FileText, Image, Film, Music, File } from "lucide-react";
import { Button } from "./button";

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number;
  onFilesChange?: (files: File[]) => void;
  onFileRemove?: (index: number) => void;
  files?: File[];
  disabled?: boolean;
  className?: string;
  label?: string;
  description?: string;
  error?: string;
  showPreview?: boolean;
}

function FileUpload({
  accept,
  multiple = false,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024,
  onFilesChange,
  onFileRemove,
  files = [],
  disabled = false,
  className,
  label,
  description,
  error,
  showPreview = true,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.startsWith("image/")) return <Image className="h-5 w-5" />;
    if (type.startsWith("video/")) return <Film className="h-5 w-5" />;
    if (type.startsWith("audio/")) return <Music className="h-5 w-5" />;
    if (type.includes("pdf") || type.includes("document"))
      return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const validateFiles = (newFiles: FileList | File[]) => {
    const validFiles: File[] = [];
    const fileArray = Array.from(newFiles);

    for (const file of fileArray) {
      if (file.size > maxSize) {
        continue;
      }
      if (files.length + validFiles.length >= maxFiles) {
        break;
      }
      validFiles.push(file);
    }

    return validFiles;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const { files: droppedFiles } = e.dataTransfer;
    const validFiles = validateFiles(droppedFiles);

    if (validFiles.length > 0) {
      onFilesChange?.([...files, ...validFiles]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files: selectedFiles } = e.target;
    if (!selectedFiles) return;

    const validFiles = validateFiles(selectedFiles);
    if (validFiles.length > 0) {
      onFilesChange?.([...files, ...validFiles]);
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleRemove = (index: number) => {
    onFileRemove?.(index);
  };

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
          isDragging
            ? "border-slate-900 bg-slate-50"
            : "border-slate-200 hover:border-slate-300",
          disabled && "cursor-not-allowed opacity-50",
          !disabled && "cursor-pointer",
          error && "border-red-500"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          disabled={disabled}
          className="hidden"
        />
        <Upload className="mb-2 h-8 w-8 text-slate-400" />
        <p className="mb-1 text-sm text-slate-600">
          <span className="font-medium text-slate-900">Click to upload</span>{" "}
          or drag and drop
        </p>
        {description && (
          <p className="text-xs text-slate-500">{description}</p>
        )}
      </div>

      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}

      {showPreview && files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between rounded-md border border-slate-200 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-slate-100 p-2 text-slate-600">
                  {getFileIcon(file)}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(index);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ImageUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
  accept?: string;
}

function ImageUpload({
  value,
  onChange,
  onRemove,
  disabled = false,
  className,
  accept = "image/*",
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange?.(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange?.(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div
      className={cn(
        "relative",
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {value ? (
        <div className="relative group">
          <img
            src={value}
            alt="Upload"
            className="h-32 w-32 rounded-lg object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => inputRef.current?.click()}
              >
                Change
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={onRemove}
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={cn(
            "flex h-32 w-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors",
            isDragging
              ? "border-slate-900 bg-slate-50"
              : "border-slate-200 hover:border-slate-300",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <Upload className="mb-1 h-6 w-6 text-slate-400" />
          <p className="text-xs text-slate-500">Upload image</p>
        </div>
      )}
    </div>
  );
}

export { FileUpload, ImageUpload };
