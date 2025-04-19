# Duplicate File Detection and Confirmation Feature

## Objective: Implement duplicate file detection and confirmation before upload

- [x] Add duplicate detection logic in PhotoUploader component
  - [x] Extract filenames from existing images
  - [x] Compare with new files being uploaded
  - [x] Mark duplicate files in the UI
- [x] Create confirmation modal for duplicate files
  - [x] Add modal component for duplicate confirmation
  - [x] Add replace/skip options
  - [x] Style the modal appropriately
- [x] Modify upload logic
  - [x] Skip or replace files based on user choice
  - [x] Update UI to reflect decisions
  - [x] Handle upload process accordingly

## Objective: Answer file size query

- [x] Explain reliable ways to get file size in Node.js.

## Objective: Refactor file size retrieval in upload endpoint

- [x] Use `fsPromises.stat` to get reliable file size.
- [x] Replace usage of `sharp.metadata().size`.

## Objective: Handle Small Image Copying

- [x] If file size < 1MB, copy original to thumbnail path instead of compressing.
- [x] Apply compression only if file size >= 1MB.

## Objective: Update UI Default Compression Settings

- [x] Set default `compression_method` to 'size'.
- [x] Set default `target_size` to 1000 KB (1024000 bytes).

# Cleanup Server Logs

- [x] Remove unnecessary console.log statements from `server/src/index.ts`

# Image Compression Logic Review

- [ ] Analyze `optimizeToTargetSize` function.
- [ ] Analyze `optimizeToTargetDimensions` function.
- [ ] Evaluate the 1MB threshold logic in the `/upload` endpoint.
- [ ] Consider output format flexibility (JPEG, WEBP, PNG).
- [ ] Refine `optimizeToTargetSize` search algorithm for better convergence.
- [ ] Review fixed quality (80) in `optimizeToTargetDimensions`; consider making it adaptive or configurable.
- [ ] Clarify "thumbnail" naming convention when original files are copied.
