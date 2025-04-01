import { PhotoUploader } from "@/components/photo-uploader"

export default function Home() {
  return (
    <main className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Photo Upload System</h1>
      <PhotoUploader
        username="paul_photos"
        uploadServerUrl={process.env.NEXT_PUBLIC_UPLOAD_SERVER_URL || "http://localhost:3001"}
        onUploadComplete={(paths) => {
          console.log("Upload completed:", paths)
        }}
      />
    </main>
  )
}

