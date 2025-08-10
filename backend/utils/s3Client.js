const { S3Client } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { PutObjectCommand } = require('@aws-sdk/client-s3');

// Create S3 client (like creating a connection to S3)
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Function to create secure upload URL
async function generateUploadUrl(fileName, fileType) {
  // Create unique file path
  const timestamp = Date.now();
  const key = `documents/${timestamp}-${fileName}`;
  
  // Create upload command
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    ContentType: fileType,
  });

  try {
    // Generate secure URL (expires in 1 hour)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return { uploadUrl, key };
  } catch (error) {
    console.error('Error generating upload URL:', error);
    throw new Error('Failed to generate upload URL');
  }
}

module.exports = { s3Client, generateUploadUrl };