import express from "express"
import multer from "multer"
import cors from "cors"
import path from "path"
import { promises as fsPromises } from "fs"
import os from "os"
import sharp from "sharp"
import * as ftp from "basic-ftp"
import dotenv from "dotenv"

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Enable CORS
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)

app.use(express.json())

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const username = req.body.username
    const folder = req.body.folder

    if (!username || !folder) {
      return cb(new Error("Missing username or folder"), "")
    }

    const uploadDir = path.join(os.tmpdir(), "uploads")
    const userDir = path.join(uploadDir, username)
    const folderDir = path.join(userDir, folder)

    try {
      await ensureDir(uploadDir)
      await ensureDir(userDir)
      await ensureDir(folderDir)
      cb(null, folderDir)
    } catch (error) {
      cb(error as Error, "")
    }
  },
  filename: (req, file, cb) => {
    const fileExtension = path.extname(file.originalname)
    const baseFilename = path.basename(file.originalname, fileExtension)
    const timestamp = Date.now()
    const uniqueFilename = `${baseFilename}-${timestamp}${fileExtension}`
    cb(null, uniqueFilename)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed"), false)
    }
  },
})

// Helper function to create directory if it doesn't exist
async function ensureDir(dirPath: string) {
  try {
    await fsPromises.mkdir(dirPath, { recursive: true })
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error)
    throw error
  }
}

// Validate username format
function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]+$/.test(username)
}

// Endpoint for file uploads
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file
    const username = req.body.username
    const folder = req.body.folder

    if (!file || !username || !folder) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    // Validate username
    if (!isValidUsername(username)) {
      return res.status(400).json({ error: "Invalid username format" })
    }

    // Create thumbnail directory
    const folderDir = path.dirname(file.path)
    const thumbnailDir = path.join(folderDir, "thumbnails")
    await ensureDir(thumbnailDir)

    // Generate thumbnail filename
    const thumbnailFilename = `tn_${file.filename}`
    const thumbnailPath = path.join(thumbnailDir, thumbnailFilename)

    // Process image and create thumbnail
    const imageInfo = await sharp(file.path).metadata()

    if (imageInfo.size && imageInfo.size > 2 * 1024 * 1024) {
      // Optimize large images
      await sharp(file.path).resize(800).jpeg({ quality: 80 }).toFile(thumbnailPath)
    } else {
      // Create regular thumbnail for smaller images
      await sharp(file.path).resize(400).toFile(thumbnailPath)
    }

    // Upload to FTP server
    await uploadToFtp(username, folder, file.path, thumbnailPath, file.filename)

    // Return success response with paths
    res.json({
      success: true,
      path: `${username}/${folder}/${file.filename}`,
      thumbnailPath: `${username}/${folder}/thumbnails/${thumbnailFilename}`,
    })
  } catch (error) {
    console.error("Upload error:", error)
    res.status(500).json({ error: "Upload failed" })
  }
})

// Function to upload files to FTP server
async function uploadToFtp(
  username: string,
  folder: string,
  originalPath: string,
  thumbnailPath: string,
  filename: string,
) {
  const client = new ftp.Client()
  client.ftp.verbose = process.env.NODE_ENV === "development"

  try {
    // Connect to FTP server using environment variables
    await client.access({
      host: process.env.FTP_HOST || "",
      user: process.env.FTP_USER || "",
      password: process.env.FTP_PASSWORD || "",
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

    console.log(`Successfully uploaded ${filename} to FTP server`)
  } catch (error) {
    console.error("FTP upload error:", error)
    throw error
  } finally {
    client.close()
  }
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" })
})

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

