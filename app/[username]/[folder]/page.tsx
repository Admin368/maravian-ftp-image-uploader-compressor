"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { PhotoUploader } from "@/components/photo-uploader";

interface ImageData {
  name: string;
  originalUrl: string;
  thumbnailUrl: string;
  originalSize?: number;
  thumbnailSize?: number;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const calculateCompression = (original: number, thumbnail: number): string => {
  const percentage = (thumbnail / original) * 100;
  return `${percentage.toFixed(1)}%`;
};

const url = process.env.NEXT_PUBLIC_SERVER_URL;

export default function FolderPage() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [compressionMethod, setCompressionMethod] = useState<
    "size" | "dimension"
  >("dimension");
  const [targetWidth, setTargetWidth] = useState(1600);
  const [targetHeight, setTargetHeight] = useState<number | "">("");
  const [targetSize, setTargetSize] = useState(1024);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const username = params.username;
  const folder = params.folder;

  useEffect(() => {
    refreshImages();
  }, [username, folder]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Here you would implement the file upload logic
    // Using the compression settings and uploading to your endpoint
  };

  const refreshImages = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!username || !folder) {
        throw new Error("Username and folder are required");
      }
      const response = await fetch(`/api/gallery?username=${username}`);

      if (!response.ok) {
        throw new Error("Failed to fetch images");
      }

      const data = await response.json();
      const folderData = data[folder as string];

      if (folderData) {
        const imageData: ImageData[] = folderData.image_urls.map(
          (url: string, index: number) => ({
            name: url.split("/").pop() || "",
            originalUrl: url,
            thumbnailUrl: folderData.thumbnail_urls[index],
            originalSize: folderData.image_sizes[index],
            thumbnailSize: folderData.thumbnail_sizes[index],
          })
        );
        setImages(imageData);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
      console.error("Error fetching images:", error);
    } finally {
      setLoading(false);
    }
  };

  // Extract existing filenames
  const existingFilenames = images.map((img) => img.name);

  //   if (loading) {
  //     return (
  //       <main className="min-h-screen p-8">
  //         <div className="flex items-center justify-center">
  //           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  //         </div>
  //       </main>
  //     );
  //   }

  // if (error) {
  //   return (
  //     <main className="min-h-screen p-8">
  //       <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
  //         <p>{error}</p>
  //         <button
  //           onClick={refreshImages}
  //           className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
  //         >
  //           Retry
  //         </button>
  //       </div>
  //     </main>
  //   );
  // }
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-8">{params.folder}</h1>

      {/* Upload Section */}
      <div className="mb-8 p-4 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-semibold mb-4">Upload Images</h2>
        URL:{JSON.stringify(url)}
        <PhotoUploader
          folder={folder as string}
          uploadServerUrl={url}
          username={username as string}
          compressionMethod={compressionMethod}
          targetWidth={
            compressionMethod === "dimension" ? targetWidth : undefined
          }
          targetHeight={
            compressionMethod === "dimension"
              ? targetHeight || undefined
              : undefined
          }
          targetSize={
            compressionMethod === "size" ? targetSize * 1024 : undefined
          }
          onUploadComplete={() => refreshImages()}
          existingFiles={existingFilenames}
        />
      </div>

      {/* Gallery Controls */}
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
          >
            {showThumbnails ? "Show Full Images" : "Show Thumbnails"}
          </button>
        </div>
        <button
          onClick={refreshImages}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Refresh Gallery
        </button>
      </div>

      {/* Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((image) => (
          <div
            key={image.originalUrl}
            className="relative group cursor-pointer aspect-[3/4] overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={() => setSelectedImage(image)}
          >
            <Image
              src={showThumbnails ? image.thumbnailUrl : image.originalUrl}
              alt={image.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-2">
              <p className="text-white text-sm font-medium text-center">
                {showThumbnails ? "Thumbnail View" : "Full Image"}
              </p>
            </div>
            <div className="absolute bottom-0 left-0 right-0">
              <div className="bg-black/70 backdrop-blur-sm p-4">
                <p className="text-white font-medium truncate">{image.name}</p>
                <div className="text-gray-300 text-sm space-y-1">
                  {image.originalSize && (
                    <p>Original: {formatFileSize(image.originalSize)}</p>
                  )}
                  {image.thumbnailSize && (
                    <p>Thumbnail: {formatFileSize(image.thumbnailSize)}</p>
                  )}
                  {image.originalSize && image.thumbnailSize && (
                    <p className="text-green-400">
                      The thumbnail is{" "}
                      {calculateCompression(
                        image.originalSize,
                        image.thumbnailSize
                      )}{" "}
                      of original
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Full Screen Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            <Image
              src={selectedImage.originalUrl}
              alt={selectedImage.name}
              fill
              className="object-contain"
            />
            <div className="absolute bottom-4 left-4 right-4 text-center bg-black/50 p-4 rounded-lg">
              <p className="text-white text-lg">{selectedImage.name}</p>
              {selectedImage.originalSize && (
                <p className="text-gray-300 text-sm">
                  {(selectedImage.originalSize / (1024 * 1024)).toFixed(2)} MB
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
