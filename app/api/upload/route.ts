import { type NextRequest, NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import path from "path"
import os from "os"
import sharp from "sharp"
import * as ftp from "basic-ftp"

// This is a temporary directory to store files before FTP upload
const getTempUploadDir = () => path.join(os.tmpdir(), "uploads")

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const username = formData.get("username") as string
    const folder = formData.get("folder") as string

    if (!file || !username || !folder) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate username (example validation)
    // In a real app, you would check against a database or auth service
    if (!username.match(/^[a-zA-Z0-9_]+$/)) {
      return NextResponse.json({ error: "Invalid username format" }, { status: 400 })
    }

    // Create directory structure
    const uploadDir = getTempUploadDir()
    const userDir = path.join(uploadDir, username)
    const folderDir = path.join(userDir, folder)
    const thumbnailDir = path.join(folderDir, "thumbnails")

    // Create directories if they don't exist
    await createDirIfNotExists(userDir)
    await createDirIfNotExists(folderDir)
    await createDirIfNotExists(thumbnailDir)

    // Get file buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique filename
    const originalFilename = file.name
    const fileExtension = path.extname(originalFilename)
    const baseFilename = path.basename(originalFilename, fileExtension)
    const timestamp = Date.now()
    const uniqueFilename = `${baseFilename}-${timestamp}${fileExtension}`

    // Paths for original and thumbnail
    const originalPath = path.join(folderDir, uniqueFilename)
    const thumbnailPath = path.join(thumbnailDir, `tn_${uniqueFilename}`)

    // Process image
    const imageInfo = await sharp(buffer).metadata()

    // Save original file
    await writeFile(originalPath, buffer)

    // Create thumbnail and optimize if needed
    if (imageInfo.size && imageInfo.size > 2 * 1024 * 1024) {
      // Optimize large images
      await sharp(buffer)
        .resize(800) // Resize to reasonable thumbnail size
        .jpeg({ quality: 80 }) // Compress
        .toFile(thumbnailPath)
    } else {
      // Create regular thumbnail for smaller images
      await sharp(buffer)
        .resize(400) // Smaller thumbnail
        .toFile(thumbnailPath)
    }

    // Upload to FTP server
    await uploadToFtp(username, folder, originalPath, thumbnailPath, uniqueFilename)

    // Return success response with paths
    return NextResponse.json({
      success: true,
      path: `${username}/${folder}/${uniqueFilename}`,
      thumbnailPath: `${username}/${folder}/thumbnails/tn_${uniqueFilename}`,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}

async function createDirIfNotExists(dir: string) {
  try {
    await writeFile(`${dir}/.keep`, "", { flag: "wx" })
  } catch (error: any) {
    // Ignore if directory already exists
    if (error.code !== "EEXIST") {
      throw error
    }
  }
}

async function uploadToFtp(
  username: string,
  folder: string,
  originalPath: string,
  thumbnailPath: string,
  filename: string,
) {
  const client = new ftp.Client()

  try {
    // Connect to FTP server
    // In production, use environment variables for these credentials
    await client.access({
      host: process.env.FTP_HOST || "ftp.example.com",
      user: process.env.FTP_USER || "username",
      password: process.env.FTP_PASSWORD || "password",
      secure: true,
    })

    // Create directory structure on FTP server
    await client.ensureDir(`${username}`)
    await client.ensureDir(`${username}/${folder}`)
    await client.ensureDir(`${username}/${folder}/thumbnails`)

    // Upload original file
    await client.uploadFrom(originalPath, `${username}/${folder}/${filename}`)

    // Upload thumbnail
    await client.uploadFrom(thumbnailPath, `${username}/${folder}/thumbnails/tn_${filename}`)
  } catch (error) {
    console.error("FTP upload error:", error)
    throw error
  } finally {
    client.close()
  }
}

