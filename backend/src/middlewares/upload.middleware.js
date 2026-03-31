const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

const UPLOAD_ROOT = path.join(__dirname, '../../uploads');
const DOCUMENTS_DIR = path.join(UPLOAD_ROOT, 'documents');

const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
]);

const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

function ensureDocumentsDir() {
  fs.mkdirSync(DOCUMENTS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    ensureDocumentsDir();
    cb(null, DOCUMENTS_DIR);
  },
  filename(req, file, cb) {
    const ext = MIME_TO_EXT[file.mimetype] || path.extname(file.originalname || '').toLowerCase();
    const allowedExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];
    const safeExt = allowedExt.includes(ext) ? (ext === '.jpeg' ? '.jpg' : ext) : '.bin';
    cb(null, `${crypto.randomUUID()}${safeExt}`);
  },
});

function fileFilter(req, file, cb) {
  if (ALLOWED_MIMES.has(file.mimetype)) {
    cb(null, true);
    return;
  }
  const err = new Error(
    'Invalid file type. Allowed: JPEG, PNG, GIF, WebP images and PDF.'
  );
  err.statusCode = 400;
  cb(err);
}

const uploadDocument = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  fileFilter,
});

const uploadDocumentSingle = uploadDocument.single('file');

module.exports = {
  uploadDocumentSingle,
  DOCUMENTS_DIR,
  UPLOAD_ROOT,
  MAX_FILE_BYTES,
  ALLOWED_MIMES,
};
