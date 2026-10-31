// S3-compatible object storage (AWS S3, MinIO, Cloudflare R2, ...).
// Credentials come from the standard AWS environment / credential chain.
const fs = require('fs');
const {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectsCommand,
} = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

function createS3Storage({ bucket, region, endpoint, forcePathStyle }) {
  const client = new S3Client({ region, endpoint, forcePathStyle });

  return {
    async putFile(key, srcPath) {
      await new Upload({
        client,
        params: {
          Bucket: bucket,
          Key: key,
          Body: fs.createReadStream(srcPath),
          ContentType: 'application/octet-stream', // always ciphertext
        },
      }).done();
    },

    async getStream(key) {
      const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      return { stream: res.Body, size: res.ContentLength };
    },

    async copy(srcKey, destKey) {
      await client.send(
        new CopyObjectCommand({
          Bucket: bucket,
          CopySource: `${bucket}/${srcKey.split('/').map(encodeURIComponent).join('/')}`,
          Key: destKey,
        })
      );
    },

    async deleteMany(keys) {
      // DeleteObjects accepts at most 1000 keys per call
      for (let i = 0; i < keys.length; i += 1000) {
        const batch = keys.slice(i, i + 1000);
        await client.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
          })
        );
      }
    },
  };
}

module.exports = { createS3Storage };
