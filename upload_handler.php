<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Adjust for production, allow specific origins
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle OPTIONS request for CORS preflight
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

// --- Configuration ---
$nextjsVerifyUrl = 'YOUR_NEXTJS_VERIFY_API_URL'; // <-- IMPORTANT: Replace with your actual Next.js verify API URL
$baseUploadPath = __DIR__ . '/uploads'; // Base directory for all uploads (relative to this script's location)
// -------------------

$response = ['success' => false, 'message' => 'An unknown error occurred.'];

// 1. Get Key from POST data
$apiKey = isset($_POST['apiKey']) ? $_POST['apiKey'] : null;

if (!$apiKey) {
    http_response_code(400);
    $response['message'] = 'API key is missing.';
    echo json_encode($response);
    exit;
}

// Check for uploaded files (assuming 'originalFile' and 'thumbnailFile' are the names used in the client-side FormData)
if (!isset($_FILES['originalFile']) || !isset($_FILES['thumbnailFile'])) {
    http_response_code(400);
    $response['message'] = 'Original or thumbnail file is missing.';
    echo json_encode($response);
    exit;
}

// 2. Verify Key with Next.js API
$ch = curl_init($nextjsVerifyUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['key' => $apiKey]));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Content-Length: ' . strlen(json_encode(['key' => $apiKey]))
]);

$verifyResultJson = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(500);
    $response['message'] = 'Error verifying key with API: ' . $curlError;
    error_log('cURL Error verifying key: ' . $curlError); // Log error server-side
    echo json_encode($response);
    exit;
}

if ($httpCode !== 200) {
    http_response_code(401); // Assume auth error if not 200
    $response['message'] = 'Invalid API key or verification failed. API status: ' . $httpCode;
    $response['api_response'] = json_decode($verifyResultJson, true); // Include API response if possible
    error_log('API Key verification failed. Status: ' . $httpCode . ', Response: ' . $verifyResultJson);
    echo json_encode($response);
    exit;
}

$verifyResult = json_decode($verifyResultJson, true);

if (!$verifyResult || !isset($verifyResult['valid']) || $verifyResult['valid'] !== true || !isset($verifyResult['username']) || !isset($verifyResult['folder'])) {
    http_response_code(401);
    $response['message'] = 'API key validation failed or returned invalid data.';
    $response['api_response'] = $verifyResult; 
    error_log('API Key validation failed or returned invalid data. Response: ' . $verifyResultJson);
    echo json_encode($response);
    exit;
}

// 3. Prepare File Paths and Directories
$username = $verifyResult['username'];
$folder = $verifyResult['folder'];

// Basic sanitization (consider more robust sanitization)
$username = preg_replace('/[^a-zA-Z0-9_\-]/', '', $username);
$folder = preg_replace('/[^a-zA-Z0-9_\-]/', '', $folder);

if (empty($username) || empty($folder)) {
     http_response_code(400);
     $response['message'] = 'Invalid username or folder received from API.';
     error_log('Invalid username/folder after sanitization. Original: ' . $verifyResult['username'] . '/' . $verifyResult['folder']);
     echo json_encode($response);
     exit;
}

$userFolderPath = $baseUploadPath . '/' . $username . '/' . $folder;
$originalPath = $userFolderPath . '/original';
$thumbnailPath = $userFolderPath . '/thumb';

// Create directories if they don't exist
if (!is_dir($originalPath) && !mkdir($originalPath, 0755, true)) { // Recursive directory creation
    http_response_code(500);
    $response['message'] = 'Failed to create original directory.';
    error_log('Failed to create directory: ' . $originalPath);
    echo json_encode($response);
    exit;
}
if (!is_dir($thumbnailPath) && !mkdir($thumbnailPath, 0755, true)) {
    http_response_code(500);
    $response['message'] = 'Failed to create thumbnail directory.';
    error_log('Failed to create directory: ' . $thumbnailPath);
    echo json_encode($response);
    exit;
}

// 4. Move Uploaded Files
$originalFile = $_FILES['originalFile'];
$thumbnailFile = $_FILES['thumbnailFile'];

// Use original filename (consider sanitizing filenames further)
$originalFilename = basename($originalFile['name']);
$thumbnailFilename = basename($thumbnailFile['name']); 

$originalDest = $originalPath . '/' . $originalFilename;
$thumbnailDest = $thumbnailPath . '/' . $thumbnailFilename;

// Handle potential filename collisions (e.g., append timestamp or check existence)
// For simplicity, we'll overwrite existing files with the same name for now.

if (move_uploaded_file($originalFile['tmp_name'], $originalDest)) {
    if (move_uploaded_file($thumbnailFile['tmp_name'], $thumbnailDest)) {
        $response['success'] = true;
        $response['message'] = 'Files uploaded successfully.';
        $response['originalUrl'] = str_replace($_SERVER['DOCUMENT_ROOT'], '', $originalDest); // Example relative URL
        $response['thumbnailUrl'] = str_replace($_SERVER['DOCUMENT_ROOT'], '', $thumbnailDest); // Example relative URL
        http_response_code(200);
    } else {
        http_response_code(500);
        $response['message'] = 'Original uploaded, but failed to move thumbnail file.';
        error_log('Failed to move thumbnail file to: ' . $thumbnailDest . ' from ' . $thumbnailFile['tmp_name']);
        // Attempt to clean up the original file if thumbnail fails?
        unlink($originalDest);
    }
} else {
    http_response_code(500);
    $response['message'] = 'Failed to move original file.';
    error_log('Failed to move original file to: ' . $originalDest . ' from ' . $originalFile['tmp_name']);
}

echo json_encode($response);
?> 