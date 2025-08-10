// backend/utils/chunker.js

// Function to split text into sentences (simple approach)
function splitIntoSentences(text) {
  // Split on sentence endings, but be careful with abbreviations
  return text
    .split(/(?<=[.!?])\s+/)
    .filter(sentence => sentence.trim().length > 0);
}

// Function to count approximate tokens (1 token ≈ 0.75 words)
function estimateTokens(text) {
  const words = text.split(/\s+/).length;
  return Math.ceil(words * 0.75);
}

// Main chunking function
function chunkText(text, maxTokens = 400, overlapTokens = 50) {
  console.log(`📝 Starting text chunking...`);
  console.log(`📊 Input: ${text.length} characters, ~${estimateTokens(text)} tokens`);
  
  const sentences = splitIntoSentences(text);
  console.log(`✂️ Split into ${sentences.length} sentences`);
  
  const chunks = [];
  let currentChunk = [];
  let currentTokens = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceTokens = estimateTokens(sentence);
    
    // If adding this sentence would exceed the limit, start a new chunk
    if (currentTokens + sentenceTokens > maxTokens && currentChunk.length > 0) {
      // Create chunk from current sentences
      const chunkText = currentChunk.join(' ').trim();
      
      if (chunkText.length > 0) {
        chunks.push({
          text: chunkText,
          tokenCount: currentTokens,
          sentenceCount: currentChunk.length,
          chunkIndex: chunks.length
        });
      }
      
      // Start new chunk with overlap
      // Keep the last few sentences for context
      const overlapSentences = [];
      let overlapTokenCount = 0;
      
      for (let j = currentChunk.length - 1; j >= 0; j--) {
        const overlapSentence = currentChunk[j];
        const overlapSentenceTokens = estimateTokens(overlapSentence);
        
        if (overlapTokenCount + overlapSentenceTokens <= overlapTokens) {
          overlapSentences.unshift(overlapSentence);
          overlapTokenCount += overlapSentenceTokens;
        } else {
          break;
        }
      }
      
      currentChunk = [...overlapSentences, sentence];
      currentTokens = overlapTokenCount + sentenceTokens;
    } else {
      // Add sentence to current chunk
      currentChunk.push(sentence);
      currentTokens += sentenceTokens;
    }
  }
  
  // Add the last chunk if it has content
  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join(' ').trim();
    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        tokenCount: currentTokens,
        sentenceCount: currentChunk.length,
        chunkIndex: chunks.length
      });
    }
  }
  
  console.log(`✅ Created ${chunks.length} chunks`);
  return chunks;
}

// Add metadata to chunks
function addMetadataToChunks(chunks, documentId, documentMetadata) {
  console.log(`🏷️ Adding metadata to ${chunks.length} chunks`);
  
  return chunks.map((chunk, index) => ({
    id: `${documentId}_chunk_${index}`,
    documentId,
    ...chunk,
    metadata: {
      ...documentMetadata,
      chunkIndex: index,
      totalChunks: chunks.length,
      isFirstChunk: index === 0,
      isLastChunk: index === chunks.length - 1
    },
    createdAt: new Date().toISOString()
  }));
}

// Function to get chunk statistics
function getChunkingStats(chunks) {
  const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0);
  const avgTokensPerChunk = totalTokens / chunks.length;
  const maxTokens = Math.max(...chunks.map(c => c.tokenCount));
  const minTokens = Math.min(...chunks.map(c => c.tokenCount));
  
  return {
    totalChunks: chunks.length,
    totalTokens,
    avgTokensPerChunk: Math.round(avgTokensPerChunk),
    maxTokensPerChunk: maxTokens,
    minTokensPerChunk: minTokens
  };
}

module.exports = {
  chunkText,
  addMetadataToChunks,
  getChunkingStats,
  estimateTokens,
  splitIntoSentences
};