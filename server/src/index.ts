import express, { Request } from "express";
import multer from "multer";
import cors from "cors";
import path from "path";
import { promises as fsPromises } from "fs";
import os from "os";
import sharp from "sharp";
import * as ftp from "basic-ftp";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Extend Express Request type to include our custom property
declare global {
  namespace Express {
    interface Request {
      fileValidationError?: string;
    }
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadDir = path.join(os.tmpdir(), "uploads");
      await ensureDir(uploadDir);
      cb(null, uploadDir);
    } catch (error) {
      console.error("Error creating upload directory:", error);
      cb(error as Error, "");
    }
  },
  filename: (req, file, cb) => {
    const fileExtension = path.extname(file.originalname);
    const baseFilename = path.basename(file.originalname, fileExtension);
    const timestamp = Date.now();
    const uniqueFilename = `${baseFilename}-${timestamp}${fileExtension}`;
    cb(null, uniqueFilename);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Add detailed logging
    console.log("Multer processing file:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname,
    });

    // Accept only image files
    if (file.mimetype.startsWith("image/")) {
      console.log("File accepted: Valid image type");
      cb(null, true);
    } else {
      console.log("File rejected: Not an image type");
      cb(null, false);
      if (req.fileValidationError === undefined) {
        req.fileValidationError = "Only image files are allowed";
      }
    }
  },
});

// Helper function to create directory if it doesn't exist
async function ensureDir(dirPath: string) {
  try {
    await fsPromises.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error);
    throw error;
  }
}

// Validate username format
function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]+$/.test(username);
}

// Endpoint for file uploads
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);

    const file = req.file;
    const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};
    const username = metadata.username;
    const folder = metadata.folder;

    console.log("=== Upload Request Debug ===");
    console.log("Metadata:", metadata);
    console.log(
      "File details:",
      file
        ? {
            fieldname: file.fieldname,
            originalname: file.originalname,
            encoding: file.encoding,
            mimetype: file.mimetype,
            size: file.size,
            destination: file.destination,
            filename: file.filename,
            path: file.path,
          }
        : "No file"
    );
    console.log("=========================");

    if (!file || !username || !folder) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create user and folder directories
    const userDir = path.join(file.destination, username);
    const folderDir = path.join(userDir, folder);
    await ensureDir(userDir);
    await ensureDir(folderDir);

    // Move file to final destination
    const finalPath = path.join(folderDir, file.filename);
    await fsPromises.rename(file.path, finalPath);
    file.path = finalPath;

    // Validate username
    if (!isValidUsername(username)) {
      return res.status(400).json({ error: "Invalid username format" });
    }

    // Create thumbnail directory
    const thumbnailDir = path.join(folderDir, "thumbnails");
    await ensureDir(thumbnailDir);

    // Generate thumbnail filename
    const thumbnailFilename = `tn_${file.filename}`;
    const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);

    // Process image and create thumbnail
    const imageInfo = await sharp(file.path).metadata();

    if (imageInfo.size && imageInfo.size > 2 * 1024 * 1024) {
      // Optimize large images
      await sharp(file.path)
        .resize(800)
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);
    } else {
      // Create regular thumbnail for smaller images
      await sharp(file.path).resize(400).toFile(thumbnailPath);
    }

    // Upload to FTP server
    await uploadToFtp(
      username,
      folder,
      file.path,
      thumbnailPath,
      file.filename
    );

    // Return success response with paths
    res.json({
      success: true,
      path: `${username}/${folder}/${file.filename}`,
      thumbnailPath: `${username}/${folder}/thumbnails/${thumbnailFilename}`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Function to upload files to FTP server
async function uploadToFtp(
  username: string,
  folder: string,
  originalPath: string,
  thumbnailPath: string,
  filename: string
) {
  const client = new ftp.Client();
  client.ftp.verbose = process.env.NODE_ENV === "development";

  const credentials = {
    host: process.env.FTP_HOST || "",
    user: process.env.FTP_USER || "",
    password: process.env.FTP_PASSWORD || "",
    secure: false,
  };

  console.log("FTP credentials:", credentials);

  try {
    // Verify local files exist before attempting upload
    const originalExists = await fsPromises
      .access(originalPath)
      .then(() => true)
      .catch(() => false);
    const thumbnailExists = await fsPromises
      .access(thumbnailPath)
      .then(() => true)
      .catch(() => false);

    if (!originalExists || !thumbnailExists) {
      throw new Error(
        `Local files not found. Original: ${originalExists}, Thumbnail: ${thumbnailExists}`
      );
    }

    // Connect to FTP server using environment variables
    await client.access({ ...credentials, port: 21 });

    console.log("=== FTP Upload Debug ===");

    // Create full directory paths
    const basePath = `/${username}`;
    const folderPath = `${basePath}/${folder}`;
    const thumbnailDirPath = `${folderPath}/thumbnails`;

    console.log("Creating directory structure:");
    console.log(`Base path: ${basePath}`);
    console.log(`Folder path: ${folderPath}`);
    console.log(`Thumbnail path: ${thumbnailDirPath}`);

    // Create all directories using absolute paths
    try {
      await client.ensureDir(basePath);
      console.log(`Created/verified base dir: ${basePath}`);
    } catch (err: any) {
      console.error(`Error creating base dir: ${err.message}`);
    }

    try {
      await client.ensureDir(folderPath);
      console.log(`Created/verified folder dir: ${folderPath}`);
    } catch (err: any) {
      console.error(`Error creating folder dir: ${err.message}`);
    }

    try {
      await client.ensureDir(thumbnailDirPath);
      console.log(`Created/verified thumbnail dir: ${thumbnailDirPath}`);
    } catch (err: any) {
      console.error(`Error creating thumbnail dir: ${err.message}`);
    }

    // Upload original file using absolute path
    console.log("\nUploading original file:");
    console.log(`From local: ${originalPath}`);
    console.log(`To FTP: ${folderPath}/${filename}`);
    await client.uploadFrom(originalPath, `${folderPath}/${filename}`);

    // Upload thumbnail using absolute path
    const thumbnailFilename = `tn_${filename}`;
    console.log("\nUploading thumbnail:");
    console.log(`From local: ${thumbnailPath}`);
    console.log(`To FTP: ${thumbnailDirPath}/${thumbnailFilename}`);
    await client.uploadFrom(
      thumbnailPath,
      `${thumbnailDirPath}/${thumbnailFilename}`
    );

    console.log("\nUpload completed successfully!");
    console.log("======================");
  } catch (err: any) {
    console.error("=== FTP Error Details ===");
    console.error("Error Type:", err.constructor.name);
    console.error("Error Message:", err.message);
    console.error("Error Code:", err.code);
    console.error(
      "Current FTP Working Dir:",
      await client.pwd().catch(() => "Unknown")
    );
    console.error("======================");
    throw err;
  } finally {
    client.close();
  }
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
