"use client";

import Link from "next/link";

export default function Home() {
  // This would be replaced with actual API call
  const usernames = ["paul_photos"]; // Example username

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-8">Photo Galleries</h1>
      <div className="grid gap-4">
        {usernames.map((username) => (
          <Link
            key={username}
            href={`/${username}`}
            className="p-4 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <h2 className="text-2xl font-semibold">{username}</h2>
          </Link>
        ))}
      </div>
    </main>
  );
}
