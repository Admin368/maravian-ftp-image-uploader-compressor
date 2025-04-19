"use client";

import type React from "react";

import { useState, useRef, useCallback } from "react";
import { Upload, Folder, X, ImageIcon, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PhotoUploaderProps {
  username: string;
  uploadServerUrl?: string;
  onUploadComplete?: (paths: string[]) => void;
  compressionMethod?: "size" | "dimension";
  targetWidth?: number;
  targetHeight?: number;
  targetSize?: number;
  folder: string;
  onFolderChange?: (folder: string) => void;
  existingFiles?: string[];
}

interface FileWithPreview extends File {
  preview?: string;
  id: string;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  folder: string;
  _file: File;
  isDuplicate?: boolean;
}

export function PhotoUploader({
  username,
  uploadServerUrl = process.env.NEXT_PUBLIC_SERVER_URL || "",
  onUploadComplete,
  compressionMethod = "dimension",
  targetWidth = 1600,
  targetHeight,
  targetSize,
  folder,
  onFolderChange,
  existingFiles = [],
}: PhotoUploaderProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [folders, setFolders] = useState<string[]>([folder]);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateFiles, setDuplicateFiles] = useState<FileWithPreview[]>([]);
  const [localCompressionMethod, setLocalCompressionMethod] = useState<
    "size" | "dimension"
  >("size");
  const [localTargetWidth, setLocalTargetWidth] = useState(targetWidth);
  const [localTargetHeight, setLocalTargetHeight] = useState(targetHeight);
  const [localTargetSize, setLocalTargetSize] = useState(1000 * 1024);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);

      // Check for duplicates
      const duplicates: FileWithPreview[] = [];
      const newFiles = selectedFiles.map((file) => {
        const isDuplicate = existingFiles.includes(file.name);
        const fileWithPreview = {
          ...file,
          preview: URL.createObjectURL(file),
          id: `${file.name}-${Date.now()}`,
          status: "pending" as const,
          progress: 0,
          folder: folder,
          _file: file,
          isDuplicate: isDuplicate,
        };

        if (isDuplicate) {
          duplicates.push(fileWithPreview);
        }

        return fileWithPreview;
      });

      if (duplicates.length > 0) {
        setDuplicateFiles(duplicates);
        setDuplicateDialogOpen(true);
      }

      setFiles((prev) => [...prev, ...newFiles]);

      // Reset the input value so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [folder, existingFiles]
  );

  const handleDuplicateConfirmation = (replace: boolean) => {
    setFiles(
      (prev) =>
        prev
          .map((file) => {
            if (file.isDuplicate) {
              if (!replace) {
                // Remove files that shouldn't be replaced
                return null;
              }
              // Keep files that should be replaced
              return { ...file, isDuplicate: false };
            }
            return file;
          })
          .filter(Boolean) as FileWithPreview[]
    );
    setDuplicateDialogOpen(false);
    setDuplicateFiles([]);
  };

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const updatedFiles = prev.filter((file) => file.id !== id);
      return updatedFiles;
    });
  }, []);

  const addFolder = useCallback(() => {
    if (newFolderName && !folders.includes(newFolderName)) {
      setFolders((prev) => [...prev, newFolderName]);
      if (onFolderChange) {
        onFolderChange(newFolderName);
      }
      setNewFolderName("");
      setFolderDialogOpen(false);
    }
  }, [newFolderName, folders, onFolderChange]);

  const uploadFiles = async () => {
    if (files.length === 0 || isUploading) return;

    setIsUploading(true);
    setUploadProgress(0);

    const totalFiles = files.length;
    let completedFiles = 0;
    const uploadedPaths: string[] = [];

    // Update files status to uploading
    setFiles((prev) =>
      prev.map((file) => ({ ...file, status: "uploading" as const }))
    );

    // Fetch the API key first
    let apiKey: string;
    try {
      const keyResponse = await fetch("/api/upload-key");
      if (!keyResponse.ok) {
        throw new Error("Failed to get API key");
      }
      const keyData = await keyResponse.json();
      apiKey = keyData.key;
    } catch (error) {
      console.error("Error fetching API key:", error);
      setFiles((prev) =>
        prev.map((file) => ({ ...file, status: "error" as const }))
      );
      setIsUploading(false);
      return;
    }

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append(`file`, file._file);
        formData.append(
          "metadata",
          JSON.stringify({
            username,
            folder: file.folder,
            compression_method: localCompressionMethod,
            target_width: localTargetWidth,
            target_size: localTargetSize,
          })
        );

        // Add compression settings directly to FormData as well
        formData.append("compression_method", localCompressionMethod);
        formData.append("target_width", localTargetWidth.toString());
        formData.append("target_size", localTargetSize.toString());

        console.log("Uploading file:", {
          name: file._file.name,
          type: file._file.type,
          size: file._file.size,
          metadata: {
            username,
            folder: file.folder,
            compression_method: localCompressionMethod,
            target_width: localTargetWidth,
            target_size: localTargetSize,
          },
        });
        console.log(uploadServerUrl);

        const response = await fetch(`${uploadServerUrl}/upload`, {
          method: "POST",
          body: formData,
          headers: {
            "x-api-key": apiKey,
          },
          credentials: "include",
          mode: "cors",
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            `Upload failed: ${response.status} ${response.statusText}${
              errorData.error ? ` - ${errorData.error}` : ""
            }`
          );
        }

        const data = await response.json();
        uploadedPaths.push(data.path);

        // Update individual file status
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, status: "success" as const, progress: 100 }
              : f
          )
        );

        completedFiles++;
        setUploadProgress(Math.round((completedFiles / totalFiles) * 100));
      } catch (error) {
        console.error("Error uploading file:", error);

        // Update file status to error
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "error" as const } : f
          )
        );

        completedFiles++;
        setUploadProgress(Math.round((completedFiles / totalFiles) * 100));
      }
    }

    setIsUploading(false);

    if (onUploadComplete) {
      onUploadComplete(uploadedPaths);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Photo Uploader: {username}</h2>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger disabled={true} asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                {folder}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {folders.map((f) => (
                <DropdownMenuItem
                  key={f}
                  onClick={() => onFolderChange?.(f)}
                  className={folder === f ? "bg-muted" : ""}
                >
                  {f}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={() => setFolderDialogOpen(true)}>
                + Add new folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Folder</DialogTitle>
              </DialogHeader>
              <div className="flex items-center gap-2">
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name"
                />
                <Button onClick={addFolder}>Add</Button>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Add Files
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="image/*"
              className="hidden"
            />
            {files.length > 0 && (
              <Button
                onClick={uploadFiles}
                disabled={isUploading}
                className="flex items-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload All ({files.length})
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
        <div className="space-y-2">
          <label className="text-sm font-medium">Compression Method</label>
          <select
            className="w-full p-2 border rounded"
            value={localCompressionMethod}
            onChange={(e) =>
              setLocalCompressionMethod(e.target.value as "size" | "dimension")
            }
          >
            <option value="size">Size</option>
            <option value="dimension">Dimension</option>
          </select>
        </div>
        {localCompressionMethod === "dimension" ? (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Width</label>
              <Input
                type="number"
                value={localTargetWidth}
                onChange={(e) => setLocalTargetWidth(Number(e.target.value))}
                min="1"
                max="10000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Height</label>
              <Input
                type="number"
                value={localTargetHeight}
                onChange={(e) => setLocalTargetHeight(Number(e.target.value))}
                min="1"
                max="10000"
              />
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Size (KB)</label>
            <Input
              type="number"
              value={localTargetSize / 1024}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (!isNaN(value)) {
                  setLocalTargetSize(value * 1024);
                }
              }}
              min="1"
              max="10000"
            />
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {files.map((file) => (
              <Card key={file.id} className="overflow-hidden">
                <div className="relative aspect-square bg-muted">
                  {file.preview ? (
                    <img
                      src={file.preview || "/placeholder.svg"}
                      alt={file._file.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="absolute top-1 right-1 rounded-full bg-background/80 p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {file.status === "uploading" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  )}
                  {file.status === "success" && (
                    <div className="absolute bottom-1 right-1 rounded-full bg-green-500 p-1 text-white">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <CardContent className="p-2">
                  <p className="text-xs truncate" title={file._file.name}>
                    {file._file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(file._file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Folder: {file.folder}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {files.length} file{files.length !== 1 ? "s" : ""} selected
            </div>
          </div>
        </div>
      )}

      {files.length === 0 && (
        <div className="border border-dashed rounded-lg p-12 text-center">
          <div className="mx-auto flex flex-col items-center justify-center gap-1">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <h3 className="mt-2 text-lg font-semibold">
              Drag photos here or click to browse
            </h3>
            <p className="text-sm text-muted-foreground">
              Supports JPG, PNG and GIF files
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="mt-4"
            >
              Select Files
            </Button>
          </div>
        </div>
      )}

      {/* Duplicate Files Confirmation Dialog */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicate Files Detected</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The following files already exist in the folder:
            </p>
            <div className="max-h-[200px] overflow-y-auto space-y-2">
              {duplicateFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 p-2 bg-muted rounded"
                >
                  <ImageIcon className="h-4 w-4" />
                  <span className="text-sm">{file._file.name}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => handleDuplicateConfirmation(false)}
              >
                Skip Duplicates
              </Button>
              <Button
                variant="default"
                onClick={() => handleDuplicateConfirmation(true)}
              >
                Replace All
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
