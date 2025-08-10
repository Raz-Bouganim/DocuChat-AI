// test-aws.js - Quick AWS connection test
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '../.env' });

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function testAWS() {
  try {
    console.log('Testing AWS connection...');
    console.log('Bucket:', process.env.AWS_S3_BUCKET);
    
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET,
      MaxKeys: 1,
    });
    
    const response = await s3Client.send(command);
    console.log('✅ AWS S3 connection successful!');
    console.log('Bucket exists and is accessible');
    
  } catch (error) {
    console.error('❌ AWS connection failed:');
    console.error('Error:', error.message);
    
    if (error.name === 'NoSuchBucket') {
      console.log('Check your bucket name in .env file');
    } else if (error.name === 'InvalidAccessKeyId') {
      console.log('Check your access key in .env file');
    } else if (error.name === 'SignatureDoesNotMatch') {
      console.log('Check your secret access key in .env file');
    }
  }
}

testAWS();