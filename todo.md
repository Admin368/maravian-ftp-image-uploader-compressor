# Duplicate File Detection and Confirmation Feature

## Objective: Refactor Image Upload to Client-Side Processing and Direct cPanel Upload

- [x] Create Next.js API endpoint (`/api/upload-key`) to issue temporary upload keys.
- [x] Create Next.js API endpoint (`/api/verify-key`) to validate keys and return user/folder info.
- [x] Create PHP script (`upload_handler.php`) for cPanel to receive uploads, verify keys via Next.js API, and save files.
- [x] Refactor client-side component to fetch upload key.
- [x] Implement client-side image resizing/thumbnailing.
- [x] Implement client-side direct upload to the PHP endpoint (passing key and files).
- [x] Define and implement the required folder structure on the cPanel server within the PHP script.
