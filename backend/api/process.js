// backend/api/process.js
const express = require('express');
const { extractTextFromDocument } = require('../utils/textExtractor');
const { chunkText, addMetadataToChunks, getChunkingStats } = require('../utils/chunker');
const router = express.Router();

// In-memory storage for processed documents and chunks
const processedDocuments = new Map();
const documentChunks = new Map();

// GET /api/process - List all processed documents
router.get('/', (req, res) => {
  try {
    const documents = Array.from(processedDocuments.values())
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    
    console.log(`📋 Returning ${documents.length} processed documents`);
    
    res.json({ 
      documents,
      total: documents.length 
    });
    
  } catch (error) {
    console.error('❌ List processed documents error:', error);
    res.status(500).json({
      error: 'Failed to list processed documents',
      details: error.message
    });
  }
});

// POST /api/process/:documentId - Process a document
router.post('/:documentId', async (req, res) => {
  const { documentId } = req.params;
  
  try {
    console.log(`🔄 Starting processing for document: ${documentId}`);
    
    // Get document info from request body
    const { fileName, fileType, s3Key } = req.body;
    
    if (!fileName || !fileType || !s3Key) {
      return res.status(400).json({
        error: 'Missing required fields: fileName, fileType, s3Key'
      });
    }
    
    // Check if document is already being processed
    const existingDoc = processedDocuments.get(documentId);
    if (existingDoc && existingDoc.status === 'processing') {
      return res.status(409).json({
        error: 'Document is already being processed',
        document: existingDoc
      });
    }
    
    // Mark as processing
    const processingDoc = {
      documentId,
      fileName,
      fileType,
      s3Key,
      status: 'processing',
      startedAt: new Date().toISOString(),
      progress: 'Initializing...'
    };
    
    processedDocuments.set(documentId, processingDoc);
    
    // Send immediate response that processing has started
    res.json({
      message: 'Document processing started',
      document: processingDoc
    });
    
    // Continue processing in background
    processDocumentInBackground(documentId, fileName, fileType, s3Key);
    
  } catch (error) {
    console.error('❌ Processing initialization error:', error);
    
    // Update status to error
    const doc = processedDocuments.get(documentId);
    if (doc) {
      doc.status = 'error';
      doc.error = error.message;
      doc.errorAt = new Date().toISOString();
    }
    
    res.status(500).json({
      error: 'Failed to start document processing',
      details: error.message
    });
  }
});

// Background processing function
async function processDocumentInBackground(documentId, fileName, fileType, s3Key) {
  try {
    console.log(`🔄 Background processing started for: ${fileName}`);
    
    // Update progress
    const updateProgress = (progress, details) => {
      const doc = processedDocuments.get(documentId);
      if (doc) {
        doc.progress = progress;
        doc.progressDetails = details;
        processedDocuments.set(documentId, doc);
      }
    };
    
    // Step 1: Extract text
    updateProgress('Extracting text...', 'Downloading and parsing document');
    console.log(`📄 Extracting text from ${fileName}...`);
    
    const extractionResult = await extractTextFromDocument(s3Key, fileType, fileName);
    
    updateProgress('Text extracted', `Found ${extractionResult.wordCount} words, ${extractionResult.pages} pages`);
    console.log(`✅ Text extraction completed: ${extractionResult.wordCount} words`);
    
    // Step 2: Chunk text
    updateProgress('Chunking text...', 'Breaking text into AI-readable segments');
    console.log(`✂️ Chunking text for ${fileName}...`);
    
    const textChunks = chunkText(extractionResult.text, 400, 50);
    
    updateProgress('Text chunked', `Created ${textChunks.length} chunks`);
    console.log(`✅ Chunking completed: ${textChunks.length} chunks`);
    
    // Step 3: Add metadata to chunks
    updateProgress('Adding metadata...', 'Enriching chunks with document information');
    
    const chunksWithMetadata = addMetadataToChunks(textChunks, documentId, {
      fileName,
      fileType,
      ...extractionResult.metadata
    });
    
    // Step 4: Store chunks
    documentChunks.set(documentId, chunksWithMetadata);
    
    // Step 5: Calculate final statistics
    const chunkingStats = getChunkingStats(chunksWithMetadata);
    
    // Step 6: Mark as completed
    const completedDoc = {
      documentId,
      fileName,
      fileType,
      s3Key,
      status: 'completed',
      startedAt: processedDocuments.get(documentId).startedAt,
      completedAt: new Date().toISOString(),
      progress: 'Completed',
      progressDetails: 'Document processing finished successfully',
      extractionResult: {
        wordCount: extractionResult.wordCount,
        characterCount: extractionResult.characterCount,
        pages: extractionResult.pages,
        metadata: extractionResult.metadata,
        previewText: extractionResult.text.substring(0, 300) + '...'
      },
      chunkingStats,
      totalChunks: chunksWithMetadata.length,
      processingTimeMs: new Date() - new Date(processedDocuments.get(documentId).startedAt)
    };
    
    processedDocuments.set(documentId, completedDoc);
    
    console.log(`✅ Processing completed for ${fileName}`);
    console.log(`📊 Final stats: ${chunksWithMetadata.length} chunks, ${chunkingStats.totalTokens} tokens`);
    
  } catch (error) {
    console.error(`❌ Background processing failed for ${fileName}:`, error);
    
    // Update status to error
    const doc = processedDocuments.get(documentId);
    if (doc) {
      doc.status = 'error';
      doc.error = error.message;
      doc.errorAt = new Date().toISOString();
      doc.progress = 'Error';
      doc.progressDetails = error.message;
      processedDocuments.set(documentId, doc);
    }
  }
}

// GET /api/process/:documentId - Get processing status
router.get('/:documentId', (req, res) => {
  try {
    const { documentId } = req.params;
    
    const processedDoc = processedDocuments.get(documentId);
    if (!processedDoc) {
      return res.status(404).json({ 
        error: 'Document not found',
        documentId 
      });
    }
    
    console.log(`📋 Status check for ${documentId}: ${processedDoc.status}`);
    
    res.json({ document: processedDoc });
    
  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({
      error: 'Failed to check processing status',
      details: error.message
    });
  }
});

// GET /api/process/:documentId/chunks - Get document chunks
router.get('/:documentId/chunks', (req, res) => {
  try {
    const { documentId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const chunks = documentChunks.get(documentId);
    if (!chunks) {
      return res.status(404).json({ 
        error: 'Document chunks not found',
        documentId 
      });
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedChunks = chunks.slice(startIndex, endIndex);
    
    console.log(`📄 Returning chunks ${startIndex}-${endIndex} of ${chunks.length} for ${documentId}`);
    
    res.json({ 
      documentId,
      totalChunks: chunks.length,
      page: parseInt(page),
      limit: parseInt(limit),
      chunks: paginatedChunks,
      hasMore: endIndex < chunks.length
    });
    
  } catch (error) {
    console.error('❌ Get chunks error:', error);
    res.status(500).json({
      error: 'Failed to get document chunks',
      details: error.message
    });
  }
});

// GET /api/process/:documentId/preview - Get text preview
router.get('/:documentId/preview', (req, res) => {
  try {
    const { documentId } = req.params;
    
    const processedDoc = processedDocuments.get(documentId);
    if (!processedDoc || processedDoc.status !== 'completed') {
      return res.status(404).json({ 
        error: 'Processed document not found or not completed',
        documentId 
      });
    }
    
    const chunks = documentChunks.get(documentId);
    if (!chunks || chunks.length === 0) {
      return res.status(404).json({ 
        error: 'Document chunks not found',
        documentId 
      });
    }
    
    // Get preview from first few chunks
    const previewChunks = chunks.slice(0, 3);
    const previewText = previewChunks.map(chunk => chunk.text).join('\n\n');
    
    res.json({
      documentId,
      fileName: processedDoc.fileName,
      previewText: previewText.substring(0, 1000) + (previewText.length > 1000 ? '...' : ''),
      totalChunks: chunks.length,
      extractionStats: processedDoc.extractionResult
    });
    
  } catch (error) {
    console.error('❌ Get preview error:', error);
    res.status(500).json({
      error: 'Failed to get document preview',
      details: error.message
    });
  }
});

// DELETE /api/process/:documentId - Delete processed document
router.delete('/:documentId', (req, res) => {
  try {
    const { documentId } = req.params;
    
    const processedDoc = processedDocuments.get(documentId);
    if (!processedDoc) {
      return res.status(404).json({ 
        error: 'Document not found',
        documentId 
      });
    }
    
    // Remove from storage
    processedDocuments.delete(documentId);
    documentChunks.delete(documentId);
    
    console.log(`🗑️ Deleted processed document: ${processedDoc.fileName}`);
    
    res.json({ 
      message: 'Processed document deleted successfully',
      documentId,
      fileName: processedDoc.fileName
    });
    
  } catch (error) {
    console.error('❌ Delete processed document error:', error);
    res.status(500).json({
      error: 'Failed to delete processed document',
      details: error.message
    });
  }
});

module.exports = router;