import { NextResponse } from "next/server";

// Temporary store for sample keys. Replace with database later.
// IMPORTANT: This should be kept in sync with /api/upload-key/route.ts or moved to a shared module.
const sampleKeys = [
  { key: "key123", username: "user1", folder: "eventA" },
  { key: "key456", username: "user2", folder: "eventB" },
  { key: "key789", username: "user1", folder: "eventC" },
  { key: "key101", username: "user3", folder: "eventD" },
  { key: "key112", username: "user2", folder: "eventE" },
  { key: "key131", username: "user4", folder: "eventF" },
  { key: "key415", username: "user1", folder: "eventG" },
];

export async function POST(request: Request) {
  let keyToCheck: string | null = null;

  try {
    // The PHP script will likely send the key in the body
    const body = await request.json();
    keyToCheck = body.key;

    if (!keyToCheck) {
      return NextResponse.json(
        { error: "Key missing in request body" },
        { status: 400 }
      );
    }
  } catch (error) {
    // Handle cases where the body isn't valid JSON
    console.error("Error parsing request body:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const foundKeyData = sampleKeys.find((k) => k.key === keyToCheck);

  if (foundKeyData) {
    // Key is valid, return the username and folder
    // In a real scenario, you might also want to mark the key as used or check expiry
    return NextResponse.json({
      valid: true,
      username: foundKeyData.username,
      folder: foundKeyData.folder,
    });
  } else {
    // Key is invalid
    return NextResponse.json(
      { valid: false, error: "Invalid key" },
      { status: 401 }
    );
  }
}
