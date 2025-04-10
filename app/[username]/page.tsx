"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function UsernamePage({
  params,
}: {
  params: { username: string };
}) {
  const [folders, setFolders] = useState<Record<string, any>>({});
  const [newFolderName, setNewFolderName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFolders();
  }, [params.username]);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/gallery?username=${params.username}`);
      if (!response.ok) {
        throw new Error("Failed to fetch folders");
      }
      const data = await response.json();
      setFolders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async () => {
    if (!newFolderName) return;
    // Here you would make an API call to create the folder
    setNewFolderName("");
  };

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <button
            onClick={fetchFolders}
            className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-8">{params.username}'s Folders</h1>

      <div className="mb-8">
        <input
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="New folder name"
          className="p-2 border rounded mr-2"
        />
        <button
          onClick={createFolder}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Create Folder
        </button>
      </div>

      <div className="grid gap-4">
        {Object.entries(folders).map(([folderName, data]) => (
          <Link
            key={folderName}
            href={`/${params.username}/${folderName}`}
            className="p-4 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold">{folderName}</h2>
            <p className="text-gray-600">{data.image_count} images</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
