import { useFetcher } from "react-router";
import { useEffect, useState } from "react";
import {
  AlertCircleIcon,
  ImageUpIcon,
  XIcon,
  CheckIcon,
  LoaderIcon,
} from "lucide-react";

import { useFileUpload } from "~/hooks/use-file-upload";

import { Button } from "~/ui/button";
import { DialogClose } from "~/ui/dialog";
import { Alert, AlertTitle } from "~/ui/alert";

interface UploadResponse {
  upload_url: string;
  upload_method?: "PUT" | "POST";
  upload_fields?: Record<string, string>;
  media_url: string;
  error?: string;
}

interface VideoUploadProps {
  onUploadComplete?: (fileUrl: string) => void;
}

export function VideoUpload({ onUploadComplete }: VideoUploadProps) {
  const maxSizeMB = 50;
  const maxSize = maxSizeMB * 1024 * 1024;
  const fetcher = useFetcher<UploadResponse>();

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState<
    "idle" | "creating-url" | "uploading" | "success" | "error"
  >("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [
    { files, isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      getInputProps,
    },
  ] = useFileUpload({
    accept: "video/mp4,image/jpeg,image/png",
    maxSize,
  });

  const previewUrl = files[0]?.preview || null;
  const selectedFile = files[0]?.file || null;

  // Handle the response from create-upload-url API
  useEffect(() => {
    if (
      fetcher.data &&
      fetcher.state === "idle" &&
      uploadState === "creating-url"
    ) {
      if (fetcher.data.error) {
        setUploadState("error");
        setUploadError(fetcher.data.error);
        return;
      }

      if (
        fetcher.data.upload_url &&
        selectedFile &&
        selectedFile instanceof File
      ) {
        // Start the actual file upload
        uploadFileToUrl(
          fetcher.data.upload_url,
          fetcher.data.upload_method ?? "PUT",
          fetcher.data.upload_fields ?? {},
          selectedFile,
          fetcher.data.media_url
        );
      } else if (selectedFile && !(selectedFile instanceof File)) {
        setUploadState("error");
        setUploadError("Invalid file object");
      }
    }
  }, [fetcher.data, fetcher.state, uploadState, selectedFile]);

  const uploadFileToUrl = async (
    uploadUrl: string,
    uploadMethod: "PUT" | "POST",
    uploadFields: Record<string, string>,
    file: File,
    fileUrl: string
  ) => {
    setUploadState("uploading");
    setUploadProgress(0);

    try {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(Math.round(percentComplete));
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadState("success");
          setUploadProgress(100);
          onUploadComplete?.(fileUrl);
        } else {
          setUploadState("error");
          setUploadError(`Upload failed with status: ${xhr.status}`);
        }
      });

      xhr.addEventListener("error", () => {
        setUploadState("error");
        setUploadError("Network error during upload");
      });

      if (uploadMethod === "POST") {
        // Presigned POST (R2): fields must come before the file
        const formData = new FormData();
        for (const [key, value] of Object.entries(uploadFields)) {
          formData.append(key, value);
        }
        formData.append("file", file);
        xhr.open("POST", uploadUrl);
        xhr.send(formData);
      } else {
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      }
    } catch (error) {
      setUploadState("error");
      setUploadError(
        error instanceof Error ? error.message : "Unknown upload error"
      );
    }
  };

  const handleAddMedia = () => {
    if (!selectedFile || !(selectedFile instanceof File)) return;

    setUploadState("creating-url");
    setUploadError(null);

    const formData = new FormData();
    formData.append("filename", selectedFile.name);
    formData.append("contentType", selectedFile.type);
    formData.append("size", selectedFile.size.toString());

    fetcher.submit(formData, {
      method: "POST",
      action: ".",
    });
  };

  const handleRemoveFile = (fileId: string) => {
    removeFile(fileId);
    setUploadState("idle");
    setUploadError(null);
    setUploadProgress(0);
  };

  const isUploading =
    uploadState === "creating-url" || uploadState === "uploading";
  const isSuccess = uploadState === "success";
  const hasError = uploadState === "error" || errors.length > 0;

  return (
    <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
      <div className="relative">
        <div
          role="button"
          onClick={!isUploading && !isSuccess ? openFileDialog : undefined}
          onDragEnter={!isUploading && !isSuccess ? handleDragEnter : undefined}
          onDragLeave={!isUploading && !isSuccess ? handleDragLeave : undefined}
          onDragOver={!isUploading && !isSuccess ? handleDragOver : undefined}
          onDrop={!isUploading && !isSuccess ? handleDrop : undefined}
          data-dragging={isDragging || undefined}
          className="bg-card border-input hover:bg-accent/50 data-[dragging=true]:bg-accent/50 has-[input:focus]:border-ring has-[input:focus]:ring-ring/50 relative flex min-h-52 flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed p-4 transition-colors has-disabled:pointer-events-none has-disabled:opacity-50 has-[img]:border-none has-[input:focus]:ring-[3px]"
        >
          <input
            {...getInputProps()}
            className="sr-only"
            aria-label="Upload file"
            disabled={isUploading || isSuccess}
          />

          {previewUrl ? (
            <div className="absolute inset-0">
              <img
                src={previewUrl}
                alt={selectedFile?.name || "Uploaded file"}
                className="size-full object-cover"
              />

              {/* Upload progress overlay */}
              {isUploading ? (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="bg-white rounded-lg p-4 flex flex-col items-center gap-2">
                    <LoaderIcon className="size-6 animate-spin" />
                    <p className="text-sm font-medium">
                      {uploadState === "creating-url"
                        ? "Preparing upload..."
                        : `Uploading ${uploadProgress}%`}
                    </p>
                    {uploadState === "uploading" ? (
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
              <div
                className="bg-background mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border"
                aria-hidden="true"
              >
                <ImageUpIcon className="size-4 opacity-60" />
              </div>

              <p className="mb-1.5 text-sm font-medium">
                Drop your file here or click to browse
              </p>
              <p className="text-muted-foreground text-xs">
                Max size: {maxSizeMB}MB • MP4, JPEG, PNG
              </p>
            </div>
          )}
        </div>

        {previewUrl && !isSuccess ? (
          <div className="absolute top-4 right-4">
            <button
              type="button"
              className="focus-visible:border-ring focus-visible:ring-ring/50 z-50 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-[color,box-shadow] outline-none hover:bg-black/80 focus-visible:ring-[3px]"
              onClick={() => handleRemoveFile(files[0]?.id)}
              aria-label="Remove file"
              disabled={isUploading}
            >
              <XIcon className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>

      {/* File info */}
      {selectedFile && selectedFile instanceof File ? (
        <div className="text-sm text-muted-foreground">
          <p>
            <span className="font-bold">File:</span>
            {` ${selectedFile.name}`}
          </p>
          <p>
            <span className="font-bold">Size:</span>
            {` ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`}
          </p>
          <p>
            <span className="font-bold">Type:</span> {` ${selectedFile.type}`}
          </p>
        </div>
      ) : null}

      {isSuccess ? (
        <Alert variant="affirmative">
          <CheckIcon className="size-4" />
          <AlertTitle>Your file has been added to the post</AlertTitle>
        </Alert>
      ) : null}

      {/* Error messages */}
      {hasError ? (
        <Alert variant="destructive">
          <AlertCircleIcon className="size-4" />
          <AlertTitle>{uploadError || errors[0]}</AlertTitle>
        </Alert>
      ) : null}

      <div className="flex justify-end gap-2">
        {isSuccess ? (
          <DialogClose asChild>
            <Button>Finish</Button>
          </DialogClose>
        ) : (
          <Button
            onClick={handleAddMedia}
            disabled={!previewUrl || isUploading}
            loading={isUploading}
          >
            {isUploading ? (
              <>
                {uploadState === "creating-url"
                  ? "Preparing..."
                  : "Uploading..."}
              </>
            ) : (
              "Upload Media"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
