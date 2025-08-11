// Alternative: Free embedding service using HuggingFace
// backend/utils/freeEmbeddingService.js

// For now, let's create a simple in-memory vector store for development
class InMemoryVectorStore {
  constructor() {
    this.vectors = new Map();
    this.nextId = 1;
  }

  // Simple text-to-vector conversion (for development only)
  textToVector(text, dimensions = 1536) {
    // Create a simple hash-based vector (not as good as real embeddings, but works for testing)
    const words = text.toLowerCase().split(/\s+/);
    const vector = new Array(dimensions).fill(0);

    words.forEach((word, index) => {
      for (let i = 0; i < word.length; i++) {
        const charCode = word.charCodeAt(i);
        const vectorIndex = (charCode + index * i) % dimensions;
        vector[vectorIndex] += Math.sin(charCode + index) * 0.1;
      }
    });

    // Normalize vector
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0)
    );
    return magnitude > 0 ? vector.map((val) => val / magnitude) : vector;
  }

  // Store embeddings
  async upsert(embeddings) {
    embeddings.forEach((embedding) => {
      this.vectors.set(embedding.id, {
        id: embedding.id,
        values: embedding.values,
        metadata: embedding.metadata,
      });
    });

    return {
      success: true,
      storedCount: embeddings.length,
    };
  }

  // Search similar vectors
  async query(options) {
    const { vector, topK = 5, includeMetadata = true, filter = {} } = options;

    const results = [];

    for (const [id, storedVector] of this.vectors) {
      // Apply filters
      let passesFilter = true;
      for (const [key, value] of Object.entries(filter)) {
        if (storedVector.metadata[key] !== value) {
          passesFilter = false;
          break;
        }
      }

      if (!passesFilter) continue;

      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(vector, storedVector.values);

      results.push({
        id: storedVector.id,
        score: similarity,
        metadata: includeMetadata ? storedVector.metadata : undefined,
      });
    }

    // Sort by similarity and return top K
    results.sort((a, b) => b.score - a.score);
    return {
      matches: results.slice(0, topK),
    };
  }

  // Calculate cosine similarity
  cosineSimilarity(a, b) {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  // Get statistics
  async describeIndexStats() {
    return {
      totalVectorCount: this.vectors.size,
      dimension: 1536,
      indexFullness: 0,
    };
  }

  // Delete vectors
  async deleteMany(filter) {
    let deletedCount = 0;

    for (const [id, vector] of this.vectors) {
      let shouldDelete = true;

      for (const [key, value] of Object.entries(filter.filter || {})) {
        if (vector.metadata[key] !== value) {
          shouldDelete = false;
          break;
        }
      }

      if (shouldDelete) {
        this.vectors.delete(id);
        deletedCount++;
      }
    }

    return { deletedCount };
  }
}

// Development embedding service (no API calls needed)
class DevelopmentEmbeddingService {
  constructor() {
    this.vectorStore = new InMemoryVectorStore();
    this.initialized = true;
  }

  async initializePinecone() {
    console.log("🔧 Using development vector store (no API required)");
    return true;
  }

  async generateEmbedding(text, metadata = {}) {
    console.log(
      `🧠 Generating development embedding for: "${text.substring(0, 50)}..."`
    );

    const vector = this.vectorStore.textToVector(text);

    return {
      embedding: vector,
      usage: { total_tokens: text.split(/\s+/).length },
      model: "development-hash",
      text,
      metadata,
    };
  }

  async generateEmbeddingsForChunks(chunks) {
    console.log(
      `🔄 Processing ${chunks.length} chunks for development embeddings...`
    );

    const embeddings = [];
    let totalTokens = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      const result = await this.generateEmbedding(chunk.text, {
        chunkId: chunk.id,
        documentId: chunk.documentId,
        chunkIndex: chunk.chunkIndex,
        ...chunk.metadata,
      });

      embeddings.push({
        id: chunk.id,
        values: result.embedding,
        metadata: {
          text: chunk.text.substring(0, 1000),
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
    }

    console.log(`✅ Generated ${embeddings.length} development embeddings`);

    return {
      embeddings,
      totalTokens,
      successCount: embeddings.length,
      failureCount: 0,
    };
  }

  async storeEmbeddings(embeddings) {
    console.log(
      `💾 Storing ${embeddings.length} embeddings in development store...`
    );

    const result = await this.vectorStore.upsert(embeddings);

    console.log("✅ All embeddings stored in development store");

    return result;
  }

  async searchSimilarChunks(queryText, options = {}) {
    console.log(`🔍 Searching for: "${queryText}" (development mode)`);

    const queryEmbedding = await this.generateEmbedding(queryText);

    const searchResults = await this.vectorStore.query({
      vector: queryEmbedding.embedding,
      topK: options.topK || 5,
      includeMetadata: true,
      filter: options.documentId ? { documentId: options.documentId } : {},
    });

    const filteredResults = searchResults.matches.filter(
      (match) => match.score >= (options.threshold || 0.5)
    );

    console.log(
      `✅ Found ${filteredResults.length} matches in development mode`
    );

    return {
      query: queryText,
      results: filteredResults,
      totalFound: searchResults.matches.length,
      aboveThreshold: filteredResults.length,
      queryTokens: queryEmbedding.usage.total_tokens,
    };
  }

  async getEmbeddingStats() {
    return await this.vectorStore.describeIndexStats();
  }

  // Add this method to your freeEmbeddingService.js file
  // This replaces the existing deleteDocumentEmbeddings method

  async deleteDocumentEmbeddings(documentId) {
    console.log(
      `🗑️ Deleting embeddings for document: ${documentId} (development mode)`
    );

    try {
      // Get current stats before deletion
      const statsBefore = await this.vectorStore.describeIndexStats();
      console.log(`📊 Vector store before deletion:`, statsBefore);

      // Delete embeddings for this document
      const result = await this.vectorStore.deleteMany({
        filter: { documentId: documentId },
      });

      console.log(`🗑️ Deletion result:`, result);

      // Get stats after deletion to verify
      const statsAfter = await this.vectorStore.describeIndexStats();
      console.log(`📊 Vector store after deletion:`, statsAfter);

      // Calculate how many were actually deleted
      const deletedCount = result.deletedCount || 0;

      if (deletedCount === 0) {
        console.warn(`⚠️ No embeddings found for documentId: ${documentId}`);
        console.warn(
          `⚠️ Available document IDs in vector store:`,
          await this.getAvailableDocumentIds()
        );
      } else {
        console.log(
          `✅ Successfully deleted ${deletedCount} embeddings for document: ${documentId}`
        );
      }

      return {
        success: true,
        deletedCount,
        documentId,
        statsBefore,
        statsAfter,
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
        filter: {}, // No filter to get all
      });

      // Extract unique document IDs
      const documentIds = [
        ...new Set(
          queryResult.matches
            .map((match) => match.metadata?.documentId)
            .filter((id) => id)
        ),
      ];

      console.log(
        `📋 Found ${documentIds.length} unique document IDs in vector store:`,
        documentIds
      );
      return documentIds;
    } catch (error) {
      console.error("❌ Failed to get available document IDs:", error);
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
        deleteAll: true,
      });

      console.log(`🗑️ Clear all result:`, result);

      // Get stats after deletion
      const statsAfter = await this.vectorStore.describeIndexStats();
      console.log(`📊 Vector store after clearing all:`, statsAfter);

      return {
        success: true,
        deletedCount: result.deletedCount || "all",
        statsBefore,
        statsAfter,
      };
    } catch (error) {
      console.error(`❌ Failed to clear all embeddings:`, error);
      throw new Error(`Clear all embeddings failed: ${error.message}`);
    }
  }
}

module.exports = {
  InMemoryVectorStore,
  DevelopmentEmbeddingService,
};
