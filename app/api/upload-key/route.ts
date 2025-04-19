import { NextResponse } from "next/server";

// Temporary store for sample keys. Replace with database later.
const sampleKeys = [
  { key: "key123", username: "user1", folder: "eventA" },
  { key: "key456", username: "user2", folder: "eventB" },
  { key: "key789", username: "user1", folder: "eventC" },
  { key: "key101", username: "user3", folder: "eventD" },
  { key: "key112", username: "user2", folder: "eventE" },
  { key: "key131", username: "user4", folder: "eventF" },
  { key: "key415", username: "user1", folder: "eventG" },
];

// Keep track of the next key to issue (simple round-robin for now)
let keyIndex = 0;

export async function GET(request: Request) {
  // In a real scenario, you'd generate a unique, signed, short-lived key
  // and store relevant metadata (username, folder, expiry) in a database.
  if (sampleKeys.length === 0) {
    return NextResponse.json(
      { error: "No upload keys available" },
      { status: 500 }
    );
  }

  const keyToIssue = sampleKeys[keyIndex];
  keyIndex = (keyIndex + 1) % sampleKeys.length; // Cycle through keys

  // Only return the key itself to the client.
  // The client doesn't need username/folder yet.
  return NextResponse.json({ key: keyToIssue.key });
}
