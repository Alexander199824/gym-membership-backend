// src/config/fileValidation.js
const crypto = require('crypto');
const fs = require('fs');

const validateFileType = (filePath, expectedMimeType) => {
  const buffer = fs.readFileSync(filePath);
  const actualType = getFileTypeFromBuffer(buffer);
  return actualType === expectedMimeType;
};

const getFileTypeFromBuffer = (buffer) => {
  // Validar magic numbers para seguridad adicional
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }
  return null;
};

module.exports = { validateFileType };