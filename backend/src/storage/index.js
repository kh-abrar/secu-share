// Object storage for encrypted file blobs. The server only ever stores ciphertext.
const crypto = require('crypto');
const config = require('../config');
const { createLocalStorage } = require('./local');
const { createS3Storage } = require('./s3');

const storage =
  config.STORAGE_DRIVER === 's3'
    ? createS3Storage({
        bucket: config.S3_BUCKET,
        region: config.S3_REGION,
        endpoint: config.S3_ENDPOINT,
        forcePathStyle: config.S3_FORCE_PATH_STYLE,
      })
    : createLocalStorage({ dir: config.STORAGE_DIR });

// Keys are random and never derived from user-controlled names or paths
storage.newKey = (ownerId) => `${ownerId}/${crypto.randomUUID()}`;

module.exports = storage;
