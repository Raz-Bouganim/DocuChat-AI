// backend/utils/textExtractor.js
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { stripHtml } = require('string-strip-html');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

// Create S3 client (reuse from environment)
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Helper function to get file from S3
async function getFileFromS3(s3Key) {
  try {
    console.log(`📥 Downloading file from S3: ${s3Key}`);
    
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key,
    });
    
    const response = await s3Client.send(command);
    
    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    
    const buffer = Buffer.concat(chunks);
    console.log(`✅ Downloaded ${buffer.length} bytes from S3`);
    
    return buffer;
  } catch (error) {
    console.error('❌ Error getting file from S3:', error);
    throw new Error(`Failed to retrieve file from S3: ${error.message}`);
  }
}

// Extract text from PDF
async function extractTextFromPDF(buffer) {
  try {
    console.log('📄 Extracting text from PDF...');
    const data = await pdf(buffer);
    
    // Clean up the text
    const cleanText = data.text
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')  // Remove excessive line breaks
      .replace(/\s{2,}/g, ' ')  // Replace multiple spaces with single space
      .trim();
    
    console.log(`✅ PDF extraction completed: ${data.numpages} pages, ${cleanText.length} characters`);
    
    return {
      text: cleanText,
      pages: data.numpages,
      metadata: {
        title: data.info?.Title || '',
        author: data.info?.Author || '',
        subject: data.info?.Subject || '',
        creator: data.info?.Creator || '',
        producer: data.info?.Producer || '',
        creationDate: data.info?.CreationDate || null,
        pages: data.numpages
      },
      wordCount: cleanText.split(/\s+/).filter(word => word.length > 0).length,
      characterCount: cleanText.length
    };
  } catch (error) {
    console.error('❌ PDF extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

// Extract text from DOCX
async function extractTextFromDOCX(buffer) {
  try {
    console.log('📝 Extracting text from DOCX...');
    const result = await mammoth.extractRawText({ buffer });
    
    // Clean up the text
    const cleanText = result.value
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')  // Remove excessive line breaks
      .replace(/\t/g, ' ')  // Replace tabs with spaces
      .replace(/\s{2,}/g, ' ')  // Replace multiple spaces with single space
      .trim();
    
    // Estimate pages (rough calculation: ~250 words per page)
    const wordCount = cleanText.split(/\s+/).filter(word => word.length > 0).length;
    const estimatedPages = Math.max(1, Math.ceil(wordCount / 250));
    
    console.log(`✅ DOCX extraction completed: ~${estimatedPages} pages, ${cleanText.length} characters`);
    
    return {
      text: cleanText,
      pages: estimatedPages,
      metadata: {
        title: '',  // DOCX metadata extraction is more complex
        author: '',
        subject: '',
        pages: estimatedPages,
        extractionWarnings: result.messages || []
      },
      wordCount,
      characterCount: cleanText.length
    };
  } catch (error) {
    console.error('❌ DOCX extraction error:', error);
    throw new Error(`Failed to extract text from DOCX: ${error.message}`);
  }
}

// Extract text from plain text file
async function extractTextFromTXT(buffer) {
  try {
    console.log('📄 Extracting text from TXT...');
    const text = buffer.toString('utf-8');
    
    // Clean up the text
    const cleanText = text
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')  // Remove excessive line breaks
      .replace(/\s{2,}/g, ' ')  // Replace multiple spaces with single space
      .trim();
    
    const wordCount = cleanText.split(/\s+/).filter(word => word.length > 0).length;
    const estimatedPages = Math.max(1, Math.ceil(wordCount / 250));
    
    console.log(`✅ TXT extraction completed: ~${estimatedPages} pages, ${cleanText.length} characters`);
    
    return {
      text: cleanText,
      pages: estimatedPages,
      metadata: {
        title: '',
        author: '',
        subject: '',
        pages: estimatedPages,
        encoding: 'utf-8'
      },
      wordCount,
      characterCount: cleanText.length
    };
  } catch (error) {
    console.error('❌ TXT extraction error:', error);
    throw new Error(`Failed to extract text from TXT: ${error.message}`);
  }
}

// Main extraction function
async function extractTextFromDocument(s3Key, fileType, fileName) {
  try {
    console.log(`🔍 Starting text extraction for: ${fileName}`);
    console.log(`📁 File type: ${fileType}`);
    console.log(`🗂️ S3 key: ${s3Key}`);
    
    // Get file buffer from S3
    const buffer = await getFileFromS3(s3Key);
    
    let result;
    
    // Extract based on file type
    if (fileType === 'application/pdf') {
      result = await extractTextFromPDF(buffer);
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      result = await extractTextFromDOCX(buffer);
    } else if (fileType === 'text/plain') {
      result = await extractTextFromTXT(buffer);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
    
    console.log(`✅ Text extraction completed for ${fileName}`);
    console.log(`📊 Stats: ${result.wordCount} words, ${result.pages} pages, ${result.characterCount} characters`);
    
    // Add some preview text for debugging
    const previewText = result.text.substring(0, 200) + (result.text.length > 200 ? '...' : '');
    console.log(`📖 Preview: "${previewText}"`);
    
    return {
      ...result,
      fileName,
      fileType,
      s3Key,
      extractedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error(`❌ Text extraction failed for ${fileName}:`, error);
    throw error;
  }
}

module.exports = {
  extractTextFromDocument,
  extractTextFromPDF,
  extractTextFromDOCX,
  extractTextFromTXT,
  getFileFromS3
};