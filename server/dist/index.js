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
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Enable CORS
app.use((0, cors_1.default)({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express_1.default.json());
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: async (req, file, cb) => {
        const username = req.body.username;
        const folder = req.body.folder;
        if (!username || !folder) {
            return cb(new Error("Missing username or folder"), "");
        }
        const uploadDir = path_1.default.join(os_1.default.tmpdir(), "uploads");
        const userDir = path_1.default.join(uploadDir, username);
        const folderDir = path_1.default.join(userDir, folder);
        try {
            await ensureDir(uploadDir);
            await ensureDir(userDir);
            await ensureDir(folderDir);
            cb(null, folderDir);
        }
        catch (error) {
            cb(error, "");
        }
    },
    filename: (req, file, cb) => {
        const fileExtension = path_1.default.extname(file.originalname);
        const baseFilename = path_1.default.basename(file.originalname, fileExtension);
        const timestamp = Date.now();
        const uniqueFilename = `${baseFilename}-${timestamp}${fileExtension}`;
        cb(null, uniqueFilename);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept only image files
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        }
        else {
            // Pass null as first argument and false as second argument
            cb(null, false);
            // You can still create an error on the request object if needed
            if (req.fileValidationError === undefined) {
                req.fileValidationError = "Only image files are allowed";
            }
        }
    },
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
// Validate username format
function isValidUsername(username) {
    return /^[a-zA-Z0-9_]+$/.test(username);
}
// Endpoint for file uploads
app.post("/upload", upload.single("file"), async (req, res) => {
    try {
        const file = req.file;
        const username = req.body.username;
        const folder = req.body.folder;
        if (!file || !username || !folder) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        // Validate username
        if (!isValidUsername(username)) {
            return res.status(400).json({ error: "Invalid username format" });
        }
        // Create thumbnail directory
        const folderDir = path_1.default.dirname(file.path);
        const thumbnailDir = path_1.default.join(folderDir, "thumbnails");
        await ensureDir(thumbnailDir);
        // Generate thumbnail filename
        const thumbnailFilename = `tn_${file.filename}`;
        const thumbnailPath = path_1.default.join(thumbnailDir, thumbnailFilename);
        // Process image and create thumbnail
        const imageInfo = await (0, sharp_1.default)(file.path).metadata();
        if (imageInfo.size && imageInfo.size > 2 * 1024 * 1024) {
            // Optimize large images
            await (0, sharp_1.default)(file.path).resize(800).jpeg({ quality: 80 }).toFile(thumbnailPath);
        }
        else {
            // Create regular thumbnail for smaller images
            await (0, sharp_1.default)(file.path).resize(400).toFile(thumbnailPath);
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
    try {
        // Connect to FTP server using environment variables
        await client.access({
            host: process.env.FTP_HOST || "",
            user: process.env.FTP_USER || "",
            password: process.env.FTP_PASSWORD || "",
            secure: true,
        });
        // Create directory structure on FTP server
        await client.ensureDir(`${username}`);
        await client.ensureDir(`${username}/${folder}`);
        await client.ensureDir(`${username}/${folder}/thumbnails`);
        // Upload original file
        await client.uploadFrom(originalPath, `${username}/${folder}/${filename}`);
        // Upload thumbnail
        await client.uploadFrom(thumbnailPath, `${username}/${folder}/thumbnails/tn_${filename}`);
        console.log(`Successfully uploaded ${filename} to FTP server`);
    }
    catch (error) {
        console.error("FTP upload error:", error);
        throw error;
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
