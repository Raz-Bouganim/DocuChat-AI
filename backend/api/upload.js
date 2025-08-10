// backend/api/upload.js - Complete working version
const express = require('express');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Create S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// In-memory storage for file metadata
const uploadedFiles = new Map();

// Helper function to generate upload URL
async function generateUploadUrl(fileName, fileType) {
  const timestamp = Date.now();
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `documents/${timestamp}-${cleanFileName}`;
  
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    ContentType: fileType,
    Metadata: {
      'original-name': fileName,
      'uploaded-at': new Date().toISOString(),
    },
  });

  try {
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return { uploadUrl, key };
  } catch (error) {
    console.error('Error generating upload URL:', error);
    throw new Error('Failed to generate upload URL');
  }
}

// GET /api/upload - API info
router.get('/', (req, res) => {
    res.json({ 
        message: 'Upload API is working',
        version: '1.0.0',
        endpoints: [
            'POST /api/upload - Get upload URL',
            'POST /api/upload/complete - Complete upload',
            'GET /api/upload/documents - List documents',
            'DELETE /api/upload/document/:documentId - Delete document',
            'GET /api/upload/status/:documentId - Get upload status'
        ],
        aws: {
            region: process.env.AWS_REGION,
            bucket: process.env.AWS_S3_BUCKET,
            hasCredentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
        }
    });
});

// POST /api/upload - Get upload URL
router.post('/', async (req, res) => {
  try {
    const { fileName, fileType, fileSize } = req.body;
    
    console.log('Upload request:', { fileName, fileType, fileSize });
    
    // Validate required fields
    if (!fileName || !fileType || !fileSize) {
      return res.status(400).json({ 
        error: 'Missing required fields: fileName, fileType, fileSize' 
      });
    }
    
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain' // For testing
    ];
    
    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({ 
        error: 'Invalid file type. Only PDF and DOCX files are allowed.',
        allowedTypes,
        receivedType: fileType
      });
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileSize > maxSize) {
      return res.status(400).json({ 
        error: `File too large. Maximum size is ${maxSize / 1024 / 1024}MB.`,
        fileSize,
        maxSize
      });
    }
    
    // Generate unique document ID
    const documentId = uuidv4();
    
    // Get secure upload URL from S3
    const { uploadUrl, key } = await generateUploadUrl(fileName, fileType);
    
    // Store file metadata
    const fileMetadata = {
      id: documentId,
      fileName,
      fileType,
      fileSize,
      s3Key: key,
      uploadedAt: new Date().toISOString(),
      status: 'uploading'
    };
    
    uploadedFiles.set(documentId, fileMetadata);
    
    console.log('Generated upload URL for:', fileName);
    
    res.json({
      documentId,
      uploadUrl,
      message: 'Upload URL generated successfully'
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to generate upload URL',
      details: error.message 
    });
  }
});

// POST /api/upload/complete - Mark upload as complete
router.post('/complete', (req, res) => {
  try {
    const { documentId } = req.body;
    
    if (!documentId) {
      return res.status(400).json({ error: 'Document ID is required' });
    }
    
    const fileData = uploadedFiles.get(documentId);
    if (!fileData) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Update status
    fileData.status = 'uploaded';
    fileData.completedAt = new Date().toISOString();
    uploadedFiles.set(documentId, fileData);
    
    console.log('Upload completed for:', fileData.fileName);
    
    res.json({ 
      message: 'Upload completed successfully',
      document: fileData 
    });
    
  } catch (error) {
    console.error('Complete upload error:', error);
    res.status(500).json({ 
      error: 'Failed to complete upload',
      details: error.message 
    });
  }
});

// GET /api/upload/documents - List uploaded documents
router.get('/documents', (req, res) => {
  try {
    const documents = Array.from(uploadedFiles.values())
      .filter(doc => doc.status === 'uploaded')
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    
    console.log(`Returning ${documents.length} documents`);
    
    res.json({ documents });
  } catch (error) {
    console.error('List documents error:', error);
    res.status(500).json({ 
      error: 'Failed to list documents',
      details: error.message 
    });
  }
});

// DELETE /api/upload/document/:documentId - Delete a document
router.delete('/document/:documentId', (req, res) => {
  try {
    const { documentId } = req.params;
    
    const fileData = uploadedFiles.get(documentId);
    if (!fileData) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Remove from memory
    uploadedFiles.delete(documentId);
    
    console.log('Deleted document:', fileData.fileName);
    
    res.json({ 
      message: 'Document deleted successfully',
      documentId 
    });
    
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ 
      error: 'Failed to delete document',
      details: error.message 
    });
  }
});

// GET /api/upload/status/:documentId - Get upload status
router.get('/status/:documentId', (req, res) => {
  try {
    const { documentId } = req.params;
    
    const fileData = uploadedFiles.get(documentId);
    if (!fileData) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json({ 
      status: fileData.status,
      document: fileData 
    });
    
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ 
      error: 'Failed to check status',
      details: error.message 
    });
  }
});

module.exports = router;