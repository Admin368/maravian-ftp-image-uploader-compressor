"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const os_1 = __importDefault(require("os"));
const sharp_1 = __importDefault(require("sharp"));
const ftp = __importStar(require("basic-ftp"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = require("./middleware/auth");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Enable CORS
app.use((0, cors_1.default)({
    origin: [
        "https://uploader.maravian.com",
        "https://uploader.maravian.online",
        "https://main.maravian.online",
        "http://192.168.1.168:3000",
        "http://localhost:3000",
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400, // 24 hours
}));
// Add debugging middleware for CORS
app.use((req, res, next) => {
    console.log(`[CORS Debug] ${req.method} ${req.url}`);
    console.log(`[CORS Debug] Origin: ${req.headers.origin}`);
    console.log(`[CORS Debug] Access-Control-Request-Method: ${req.headers["access-control-request-method"]}`);
    console.log(`[CORS Debug] Access-Control-Request-Headers: ${req.headers["access-control-request-headers"]}`);
    next();
});
// Add a specific OPTIONS handler for the upload endpoint
app.options("/upload", (req, res) => {
    res.status(204).end();
});
// Add a general OPTIONS handler for all routes
app.options("*", (req, res) => {
    res.status(204).end();
});
app.use(express_1.default.json());
// Apply authentication middleware to all routes
app.use(auth_1.authenticateApi);
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: async (req, file, cb) => {
        try {
            const uploadDir = path_1.default.join(os_1.default.tmpdir(), "uploads");
            await ensureDir(uploadDir);
            cb(null, uploadDir);
        }
        catch (error) {
            console.error("Error creating upload directory:", error);
            cb(error, "");
        }
    },
    filename: (req, file, cb) => {
        const fileExtension = path_1.default.extname(file.originalname);
        const baseFilename = path_1.default.basename(file.originalname, fileExtension);
        const timestamp = Date.now();
        // const uniqueFilename = `${baseFilename}-${timestamp}${fileExtension}`;
        const uniqueFilename = `${baseFilename}${fileExtension}`;
        cb(null, uniqueFilename);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        // Add detailed logging
        console.log("Multer processing file:", {
            originalname: file.originalname,
            mimetype: file.mimetype,
        });
        // Accept only image files
        if (file.mimetype.startsWith("image/")) {
            console.log("File accepted: Valid image type");
            cb(null, true);
        }
        else {
            console.log("File rejected: Not an image type");
            cb(null, false);
            if (req.fileValidationError === undefined) {
                req.fileValidationError = "Only image files are allowed";
            }
        }
    },
});
// Add error handling middleware for multer
app.use((err, req, res, next) => {
    if (err instanceof multer_1.default.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
                error: "File too large. Maximum size is 50MB. If you're still seeing this error, please check with your server administrator as there might be additional size limits set at the web server level.",
            });
        }
        return res.status(400).json({ error: err.message });
    }
    next(err);
});
// Helper function to create directory if it doesn't exist
async function ensureDir(dirPath) {
    try {
        await fs_1.promises.mkdir(dirPath, { recursive: true });
    }
    catch (error) {
        console.error(`Error creating directory ${dirPath}:`, error);
        throw error;
    }
}
// Function to copy index.php to a user folder
async function copyIndexPhpToFolder(folderPath) {
    try {
        const sourceIndexPath = path_1.default.join(__dirname, "index.php");
        const targetIndexPath = path_1.default.join(folderPath, "index.php");
        // Check if index.php already exists in the target folder
        try {
            await fs_1.promises.access(targetIndexPath);
            // console.log(`index.php already exists in ${folderPath}`); // Removed
            return; // File already exists, no need to copy
        }
        catch (err) {
            // File doesn't exist, proceed with copying
            console.log(`Copying index.php to ${folderPath}`);
            await fs_1.promises.copyFile(sourceIndexPath, targetIndexPath);
            console.log(`Successfully copied index.php to ${folderPath}`);
        }
    }
    catch (error) {
        console.error(`Error copying index.php to ${folderPath}:`, error);
        // Don't throw the error to avoid blocking the upload process
    }
}
// Validate username format
function isValidUsername(username) {
    return /^[a-zA-Z0-9_]+$/.test(username);
}
// Endpoint for file uploads
app.post("/upload", upload.single("file"), async (req, res) => {
    try {
        // console.log("Request body:", req.body); // Removed
        // console.log("Request file:", req.file); // Removed
        const compression_method = req.body.compression_method || "dimension"; // dimension or size
        const target_size = req.body.target_size || 1 * 1024 * 1024; // 1MB
        const target_width = req.body.target_width || 1600;
        const target_height = req.body.target_height || undefined;
        const file = req.file;
        const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};
        const username = metadata.username;
        const folder = metadata.folder;
        // Removed debug block
        if (!file || !username || !folder) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        // Create user and folder directories
        const userDir = path_1.default.join(file.destination, username);
        const folderDir = path_1.default.join(userDir, folder);
        await ensureDir(userDir);
        await ensureDir(folderDir);
        // Copy index.php to the user folder
        await copyIndexPhpToFolder(userDir);
        // Copy index.php to the specific folder
        // await copyIndexPhpToFolder(folderDir);
        // Move file to final destination
        const finalPath = path_1.default.join(folderDir, file.filename);
        await fs_1.promises.rename(file.path, finalPath);
        file.path = finalPath;
        // Get reliable file size using fs.promises.stat
        const fileStats = await fs_1.promises.stat(finalPath);
        const fileSize = fileStats.size;
        console.log("Reliable fileSize:", fileSize);
        // Validate username
        if (!isValidUsername(username)) {
            return res.status(400).json({ error: "Invalid username format" });
        }
        // Create thumbnail directory
        const thumbnailDir = path_1.default.join(folderDir, "thumbnails");
        await ensureDir(thumbnailDir);
        // Generate thumbnail filename
        const thumbnailFilename = `tn___${file.filename}`;
        const thumbnailPath = path_1.default.join(thumbnailDir, thumbnailFilename);
        // Process image and create thumbnail
        // Removed sharp metadata call previously here
        // const imageInfo = await sharp(file.path).metadata();
        // const fileSize = imageInfo.size;
        // console.log("fileSize", fileSize);
        // Use the reliable fileSize obtained earlier
        const ONE_MB = 1 * 1024 * 1024;
        if (fileSize && fileSize < ONE_MB) {
            // If file is less than 1MB, copy it directly to thumbnails
            await fs_1.promises.copyFile(file.path, thumbnailPath);
            console.log(`Copied original file to thumbnail path as size (${fileSize} bytes) is less than 1MB.`);
        }
        else {
            // If file is 1MB or larger, optimize it
            console.log(`File size (${fileSize} bytes) is >= 1MB, applying optimization.`);
            switch (compression_method) {
                case "size":
                    await optimizeToTargetSize(file.path, thumbnailPath, target_size);
                    break;
                default:
                    await optimizeToTargetDimensions({
                        inputPath: file.path,
                        outputPath: thumbnailPath,
                        targetWidth: target_width,
                        // targetHeight: target_height,
                    });
            }
        }
        // Upload to FTP server
        await uploadToFtp(username, folder, file.path, thumbnailPath, file.filename);
        // Return success response with paths
        res.json({
            success: true,
            path: `${username}/${folder}/${file.filename}`,
            thumbnailPath: `${username}/${folder}/thumbnails/${thumbnailFilename}`,
        });
    }
    catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: "Upload failed" });
    }
});
// Function to upload files to FTP server
async function uploadToFtp(username, folder, originalPath, thumbnailPath, filename) {
    const client = new ftp.Client();
    client.ftp.verbose = process.env.NODE_ENV === "development";
    const credentials = {
        host: process.env.FTP_HOST || "",
        user: process.env.FTP_USER || "",
        password: process.env.FTP_PASSWORD || "",
        secure: false,
    };
    // Get domain prefix from environment variables
    const domainPrefix = process.env.DOMAIN_PREFIX || "";
    const pagePassword = process.env.PAGE_PASSWORD || "";
    console.log("FTP credentials:", {
        ...credentials,
        password: "********", // Hide password in logs
    });
    try {
        // Verify local files exist before attempting upload
        const originalExists = await fs_1.promises
            .access(originalPath)
            .then(() => true)
            .catch(() => false);
        const thumbnailExists = await fs_1.promises
            .access(thumbnailPath)
            .then(() => true)
            .catch(() => false);
        if (!originalExists || !thumbnailExists) {
            throw new Error(`Local files not found. Original: ${originalExists}, Thumbnail: ${thumbnailExists}`);
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
        }
        catch (err) {
            console.error(`Error creating base dir: ${err.message}`);
        }
        try {
            await client.ensureDir(folderPath);
            console.log(`Created/verified folder dir: ${folderPath}`);
        }
        catch (err) {
            console.error(`Error creating folder dir: ${err.message}`);
        }
        try {
            await client.ensureDir(thumbnailDirPath);
            console.log(`Created/verified thumbnail dir: ${thumbnailDirPath}`);
        }
        catch (err) {
            console.error(`Error creating thumbnail dir: ${err.message}`);
        }
        // Upload original file using absolute path
        console.log("Uploading original file:");
        console.log(`From local: ${originalPath}`);
        console.log(`To FTP: ${folderPath}/${filename}`);
        await client.uploadFrom(originalPath, `${folderPath}/${filename}`);
        // Upload thumbnail using absolute path
        const thumbnailFilename = `tn_${filename}`;
        console.log("Uploading thumbnail:");
        console.log(`From local: ${thumbnailPath}`);
        console.log(`To FTP: ${thumbnailDirPath}/${thumbnailFilename}`);
        await client.uploadFrom(thumbnailPath, `${thumbnailDirPath}/${thumbnailFilename}`);
        // Upload index.php to user folder and specific folder
        const sourceIndexPath = path_1.default.join(__dirname, "index.php");
        // Check if index.php exists locally
        try {
            await fs_1.promises.access(sourceIndexPath);
            // Upload index.php to user folder
            console.log("Uploading index.php to user folder:");
            console.log(`From local: ${sourceIndexPath}`);
            console.log(`To FTP: ${basePath}/index.php`);
            await client.uploadFrom(sourceIndexPath, `${basePath}/index.php`);
            // Upload index.php to specific folder
            // console.log("Uploading index.php to specific folder:"); // Removed
            // console.log(`From local: ${sourceIndexPath}`); // Removed
            // console.log(`To FTP: ${folderPath}/index.php`); // Removed
            // await client.uploadFrom(sourceIndexPath, `${folderPath}/index.php`); // Removed
        }
        catch (err) {
            console.error("Error uploading index.php:", err);
            // Don't throw the error to avoid blocking the upload process
        }
        console.log("Upload completed successfully!");
        console.log("======================");
    }
    catch (err) {
        console.error("=== FTP Error Details ===");
        console.error("Error Type:", err.constructor.name);
        console.error("Error Message:", err.message);
        console.error("Error Code:", err.code);
        console.error("Current FTP Working Dir:", await client.pwd().catch(() => "Unknown"));
        console.error("======================");
        throw err;
    }
    finally {
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
async function optimizeToTargetSize(inputPath, outputPath, targetSizeInBytes, minQuality = 60, maxQuality = 90, maxWidth = 1600) {
    const image = (0, sharp_1.default)(inputPath);
    const metadata = await image.metadata();
    let quality = maxQuality;
    let width = metadata.width || maxWidth;
    let currentSize = Infinity;
    let attempts = 0;
    const maxAttempts = 8; // Prevent infinite loops
    // Binary search for the right quality/size balance
    while (Math.abs(currentSize - targetSizeInBytes) > targetSizeInBytes * 0.1 &&
        attempts < maxAttempts) {
        const buffer = await (0, sharp_1.default)(inputPath)
            .resize(width, undefined, { fit: "inside" })
            .jpeg({ quality })
            .toBuffer();
        currentSize = buffer.length;
        if (currentSize > targetSizeInBytes) {
            // If file is too big, try reducing quality first
            if (quality > minQuality) {
                quality = Math.max(minQuality, quality - 5);
            }
            else {
                // If at minimum quality, reduce dimensions
                width = Math.max(400, Math.floor(width * 0.8));
            }
        }
        else if (currentSize < targetSizeInBytes * 0.8) {
            // If file is too small, try increasing quality
            quality = Math.min(maxQuality, quality + 5);
        }
        attempts++;
    }
    // Final optimization with found parameters
    return (0, sharp_1.default)(inputPath)
        .resize(width, undefined, { fit: "inside" })
        .jpeg({ quality })
        .toFile(outputPath);
}
async function optimizeToTargetDimensions({ inputPath, outputPath, targetWidth = 1600, }) {
    const image = (0, sharp_1.default)(inputPath);
    const metadata = await image.metadata();
    const width = metadata.width || targetWidth;
    // const height = metadata.height || targetHeight;
    return ((0, sharp_1.default)(inputPath)
        // .resize(width, height, { fit: "inside" })
        .resize(width)
        .jpeg({ quality: 80 })
        .toFile(outputPath));
}
