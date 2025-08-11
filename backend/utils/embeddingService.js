// backend/utils/embeddingService.js
const OpenAI = require("openai");
const { Pinecone } = require("@pinecone-database/pinecone");

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

let pineconeIndex = null;

// Initialize Pinecone index
async function initializePinecone() {
  try {
    console.log("🔌 Initializing Pinecone connection...");
    pineconeIndex = pinecone.index(process.env.PINECONE_INDEX_NAME);

    // Test the connection
    const stats = await pineconeIndex.describeIndexStats();
    console.log("✅ Pinecone connected successfully");
    console.log("📊 Index stats:", {
      totalVectors: stats.totalVectorCount,
      dimension: stats.dimension,
    });

    return true;
  } catch (error) {
    console.error("❌ Pinecone initialization failed:", error);
    throw error;
  }
}

// Generate embeddings for text
async function generateEmbedding(text, metadata = {}) {
  try {
    console.log(
      `🧠 Generating embedding for text: "${text.substring(0, 100)}..."`
    );

    // Clean and prepare text
    const cleanText = text.replace(/\n/g, " ").trim();

    if (cleanText.length === 0) {
      throw new Error("Text is empty after cleaning");
    }

    // Call OpenAI Embeddings API
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small", // Cost-effective model
      input: cleanText,
      encoding_format: "float",
    });

    const embedding = response.data[0].embedding;

    console.log(`✅ Generated embedding: ${embedding.length} dimensions`);

    return {
      embedding,
      usage: response.usage,
      model: "text-embedding-3-small",
      text: cleanText,
      metadata,
    };
  } catch (error) {
    console.error("❌ Embedding generation failed:", error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

// Generate embeddings for multiple chunks (batch processing)
async function generateEmbeddingsForChunks(chunks) {
  console.log(`🔄 Processing ${chunks.length} chunks for embeddings...`);

  const embeddings = [];
  let totalTokens = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    try {
      console.log(`📝 Processing chunk ${i + 1}/${chunks.length}: ${chunk.id}`);

      const result = await generateEmbedding(chunk.text, {
        chunkId: chunk.id,
        documentId: chunk.documentId,
        chunkIndex: chunk.chunkIndex,
        ...chunk.metadata,
      });

      embeddings.push({
        id: chunk.id,
        values: result.embedding,
        metadata: {
          text: chunk.text.substring(0, 1000), // Limit metadata size
          documentId: chunk.documentId,
          fileName: chunk.metadata.fileName,
          fileType: chunk.metadata.fileType,
          chunkIndex: chunk.chunkIndex,
          totalChunks: chunk.metadata.totalChunks,
          tokenCount: chunk.tokenCount,
          wordCount: chunk.wordCount,
          createdAt: chunk.createdAt,
        },
      });

      totalTokens += result.usage.total_tokens;

      // Add small delay to respect rate limits
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`❌ Failed to process chunk ${chunk.id}:`, error);
      // Continue with other chunks
    }
  }

  console.log(`✅ Generated ${embeddings.length} embeddings`);
  console.log(`📊 Total tokens used: ${totalTokens}`);

  return {
    embeddings,
    totalTokens,
    successCount: embeddings.length,
    failureCount: chunks.length - embeddings.length,
  };
}

// Store embeddings in Pinecone
async function storeEmbeddings(embeddings) {
  if (!pineconeIndex) {
    await initializePinecone();
  }

  try {
    console.log(`💾 Storing ${embeddings.length} embeddings in Pinecone...`);

    // Pinecone has a limit on batch size (usually 100)
    const batchSize = 100;
    const batches = [];

    for (let i = 0; i < embeddings.length; i += batchSize) {
      batches.push(embeddings.slice(i, i + batchSize));
    }

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(
        `📦 Storing batch ${i + 1}/${batches.length} (${batch.length} vectors)`
      );

      await pineconeIndex.upsert(batch);

      // Small delay between batches
      if (i < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log("✅ All embeddings stored successfully");

    return {
      success: true,
      storedCount: embeddings.length,
      batchCount: batches.length,
    };
  } catch (error) {
    console.error("❌ Failed to store embeddings:", error);
    throw error;
  }
}

// Search for similar chunks
async function searchSimilarChunks(queryText, options = {}) {
  if (!pineconeIndex) {
    await initializePinecone();
  }

  try {
    const {
      topK = 5,
      documentId = null,
      threshold = 0.7,
      includeMetadata = true,
    } = options;

    console.log(`🔍 Searching for: "${queryText}"`);
    console.log(
      `📊 Options: topK=${topK}, threshold=${threshold}, documentId=${documentId}`
    );

    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(queryText);

    // Build query options
    const queryOptions = {
      vector: queryEmbedding.embedding,
      topK,
      includeMetadata,
    };

    // Add filter if documentId specified
    if (documentId) {
      queryOptions.filter = { documentId };
    }

    // Search in Pinecone
    const searchResults = await pineconeIndex.query(queryOptions);

    // Filter by similarity threshold
    const filteredResults = searchResults.matches.filter(
      (match) => match.score >= threshold
    );

    console.log(
      `✅ Found ${filteredResults.length} matches above threshold ${threshold}`
    );

    return {
      query: queryText,
      results: filteredResults,
      totalFound: searchResults.matches.length,
      aboveThreshold: filteredResults.length,
      queryTokens: queryEmbedding.usage.total_tokens,
    };
  } catch (error) {
    console.error("❌ Search failed:", error);
    throw error;
  }
}

// Get statistics about stored embeddings
async function getEmbeddingStats() {
  if (!pineconeIndex) {
    await initializePinecone();
  }

  try {
    const stats = await pineconeIndex.describeIndexStats();
    return {
      totalVectors: stats.totalVectorCount,
      dimension: stats.dimension,
      indexFullness: stats.indexFullness,
      namespaces: stats.namespaces || {},
    };
  } catch (error) {
    console.error("❌ Failed to get stats:", error);
    throw error;
  }
}

// Add this method to your freeEmbeddingService.js file
// This replaces the existing deleteDocumentEmbeddings method

async deleteDocumentEmbeddings(documentId) {
    console.log(`🗑️ Deleting embeddings for document: ${documentId} (development mode)`);
    
    try {
        // Get current stats before deletion
        const statsBefore = await this.vectorStore.describeIndexStats();
        console.log(`📊 Vector store before deletion:`, statsBefore);
        
        // Delete embeddings for this document
        const result = await this.vectorStore.deleteMany({
            filter: { documentId: documentId }
        });
        
        console.log(`🗑️ Deletion result:`, result);
        
        // Get stats after deletion to verify
        const statsAfter = await this.vectorStore.describeIndexStats();
        console.log(`📊 Vector store after deletion:`, statsAfter);
        
        // Calculate how many were actually deleted
        const deletedCount = result.deletedCount || 0;
        
        if (deletedCount === 0) {
            console.warn(`⚠️ No embeddings found for documentId: ${documentId}`);
            console.warn(`⚠️ Available document IDs in vector store:`, await this.getAvailableDocumentIds());
        } else {
            console.log(`✅ Successfully deleted ${deletedCount} embeddings for document: ${documentId}`);
        }
        
        return { 
            success: true, 
            deletedCount,
            documentId,
            statsBefore,
            statsAfter
        };
        
    } catch (error) {
        console.error(`❌ Failed to delete embeddings for ${documentId}:`, error);
        throw new Error(`Embedding deletion failed: ${error.message}`);
    }
}

// Add this helper method to debug what documents are actually in the vector store
async getAvailableDocumentIds() {
    try {
        // Query to get all unique document IDs
        const queryResult = await this.vectorStore.query({
            vector: new Array(this.embeddingDimension).fill(0), // Dummy vector
            topK: 10000, // Get many results
            includeMetadata: true,
            filter: {} // No filter to get all
        });
        
        // Extract unique document IDs
        const documentIds = [...new Set(
            queryResult.matches
                .map(match => match.metadata?.documentId)
                .filter(id => id)
        )];
        
        console.log(`📋 Found ${documentIds.length} unique document IDs in vector store:`, documentIds);
        return documentIds;
        
    } catch (error) {
        console.error('❌ Failed to get available document IDs:', error);
        return [];
    }
}

// Add this method to clear ALL embeddings (for emergency cleanup)
async clearAllEmbeddings() {
    console.log(`🚨 EMERGENCY: Clearing ALL embeddings from vector store`);
    
    try {
        // Get current stats
        const statsBefore = await this.vectorStore.describeIndexStats();
        console.log(`📊 Vector store before clearing all:`, statsBefore);
        
        // Delete all embeddings
        const result = await this.vectorStore.deleteMany({
            deleteAll: true
        });
        
        console.log(`🗑️ Clear all result:`, result);
        
        // Get stats after deletion
        const statsAfter = await this.vectorStore.describeIndexStats();
        console.log(`📊 Vector store after clearing all:`, statsAfter);
        
        return {
            success: true,
            deletedCount: result.deletedCount || 'all',
            statsBefore,
            statsAfter
        };
        
    } catch (error) {
        console.error(`❌ Failed to clear all embeddings:`, error);
        throw new Error(`Clear all embeddings failed: ${error.message}`);
    }
}

// NOTE: Add these methods to your DevelopmentEmbeddingService class in freeEmbeddingService.js

module.exports = {
  initializePinecone,
  generateEmbedding,
  generateEmbeddingsForChunks,
  storeEmbeddings,
  searchSimilarChunks,
  getEmbeddingStats,
  deleteDocumentEmbeddings,
};
