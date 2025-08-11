const express = require("express");
const { extractTextFromDocument } = require("../utils/textExtractor");
const {
  chunkText,
  addMetadataToChunks,
  getChunkingStats,
} = require("../utils/chunker");
const {
  DevelopmentEmbeddingService,
} = require("../utils/freeEmbeddingService");

const embeddingService = new DevelopmentEmbeddingService();
const router = express.Router();
const processedDocuments = new Map();
const documentChunks = new Map();

router.get("/", (req, res) => {
  try {
    const documents = Array.from(processedDocuments.values()).sort(
      (a, b) => new Date(b.startedAt) - new Date(a.startedAt)
    );

    res.json({
      documents,
      total: documents.length,
    });
  } catch (error) {
    console.error("List processed documents error:", error);
    res.status(500).json({
      error: "Failed to list processed documents",
      details: error.message,
    });
  }
});

router.post("/chat", async (req, res) => {
  try {
    const { message, documentId = null, maxChunks = 8 } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    const allProcessedDocs = Array.from(processedDocuments.values());
    const completedDocs = allProcessedDocs.filter(
      (doc) => doc.status === "completed"
    );

    if (completedDocs.length === 0) {
      return res.json({
        message,
        answer:
          "I don't have any processed documents to search through yet. Please upload and process some documents first, then try asking your question again.",
        sources: [],
        relevantChunks: 0,
      });
    }

    const searchResult = await embeddingService.searchSimilarChunks(message, {
      topK: maxChunks,
      documentId,
      threshold: 0.15,
    });

    if (searchResult.results.length === 0) {
      const retryResult = await embeddingService.searchSimilarChunks(message, {
        topK: maxChunks,
        documentId,
        threshold: 0.05,
      });

      if (retryResult.results.length === 0) {
        return res.json({
          message,
          answer: `I couldn't find any relevant information in your documents to answer that question. Try asking about topics that are covered in your uploaded documents, or try rephrasing your question.`,
          sources: [],
          relevantChunks: 0,
        });
      }

      searchResult.results = retryResult.results;
    }

    const contextChunks = searchResult.results.map((result) => ({
      id: result.id,
      text: result.metadata.text,
      source: result.metadata.fileName,
      chunkIndex: result.metadata.chunkIndex,
      similarity: result.score,
    }));

    const aiResponse = generateContextualResponse(message, contextChunks);

    const sources = contextChunks.map((chunk) => ({
      source: chunk.source,
    }));

    res.json({
      message,
      answer: aiResponse,
      sources,
      relevantChunks: searchResult.results.length,
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      error: "Chat failed",
      details: error.message,
    });
  }
});

function generateContextualResponse(question, contextChunks) {
  if (!contextChunks || contextChunks.length === 0) {
    return "I couldn't find relevant information in your documents to answer this question.";
  }

  const questionLower = question.toLowerCase().trim();
  const combinedContext = contextChunks.map((chunk) => chunk.text).join(" ");

  // Clean and prepare the context
  const sentences = combinedContext
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20)
    .slice(0, 15); // Limit to prevent too much context

  // Question type analysis
  const isWhatQuestion = questionLower.includes("what");
  const isHowQuestion = questionLower.includes("how");
  const isWhyQuestion = questionLower.includes("why");
  const isOverviewQuestion =
    questionLower.includes("about") ||
    questionLower.includes("overview") ||
    questionLower.includes("summary");
  const isWhenQuestion = questionLower.includes("when");
  const isWhereQuestion = questionLower.includes("where");
  const isListQuestion =
    questionLower.includes("list") || questionLower.includes("what are");

  let response = "";

  if (
    isOverviewQuestion ||
    (isWhatQuestion &&
      (questionLower.includes("document") || questionLower.includes("project")))
  ) {
    // Document overview questions
    response = buildOverviewResponse(sentences, combinedContext);
  } else if (isListQuestion) {
    // List-type questions
    response = buildListResponse(sentences, combinedContext);
  } else if (isHowQuestion) {
    // How-to or process questions
    response = buildHowResponse(sentences, combinedContext);
  } else if (isWhyQuestion) {
    // Explanation questions
    response = buildWhyResponse(sentences, combinedContext);
  } else if (isWhenQuestion || isWhereQuestion) {
    // When/Where questions
    response = buildWhenWhereResponse(
      sentences,
      combinedContext,
      questionLower
    );
  } else {
    // General questions
    response = buildGeneralResponse(question, sentences, combinedContext);
  }

  // Ensure response is not empty
  if (!response || response.trim().length === 0) {
    response = buildFallbackResponse(sentences);
  }

  return response.trim();
}

function buildOverviewResponse(sentences, context) {
  // Look for overview, introduction, or summary content
  const overviewSentences = sentences.filter((s) => {
    const lower = s.toLowerCase();
    return (
      lower.includes("overview") ||
      lower.includes("introduction") ||
      lower.includes("document") ||
      lower.includes("project") ||
      lower.includes("system") ||
      lower.includes("assignment") ||
      lower.includes("implements") ||
      lower.includes("designed")
    );
  });

  if (overviewSentences.length > 0) {
    return `Based on your documents:\n\n${overviewSentences
      .slice(0, 3)
      .join(". ")}.`;
  }

  // Fallback to first few sentences
  return `Based on your documents:\n\n${sentences.slice(0, 3).join(". ")}.`;
}

function buildListResponse(sentences, context) {
  // Look for bullet points, numbered lists, or enumerated items
  const listItems = [];

  sentences.forEach((sentence) => {
    // Check for numbered items
    if (
      /^\d+[\.)]\s/.test(sentence.trim()) ||
      sentence.includes("first") ||
      sentence.includes("second")
    ) {
      listItems.push(sentence);
    }
    // Check for bullet-like content
    if (
      sentence.includes("include") ||
      sentence.includes("contains") ||
      sentence.includes("consists")
    ) {
      listItems.push(sentence);
    }
  });

  if (listItems.length > 0) {
    return `Based on your documents:\n\n${listItems.slice(0, 5).join("\n\n")}`;
  }

  // Fallback to structured content
  return `Based on your documents:\n\n${sentences.slice(0, 4).join("\n\n")}`;
}

function buildHowResponse(sentences, context) {
  // Look for procedural or instructional content
  const howSentences = sentences.filter((s) => {
    const lower = s.toLowerCase();
    return (
      lower.includes("step") ||
      lower.includes("process") ||
      lower.includes("method") ||
      lower.includes("procedure") ||
      lower.includes("implement") ||
      lower.includes("create") ||
      lower.includes("build") ||
      lower.includes("setup") ||
      /\b(first|then|next|finally|after)\b/.test(lower)
    );
  });

  if (howSentences.length > 0) {
    return `Based on your documents:\n\n${howSentences
      .slice(0, 4)
      .join("\n\n")}`;
  }

  // Look for any instructional content
  const instructionalSentences = sentences.filter(
    (s) =>
      s.includes("must") ||
      s.includes("should") ||
      s.includes("need to") ||
      s.includes("required")
  );

  if (instructionalSentences.length > 0) {
    return `Based on your documents:\n\n${instructionalSentences
      .slice(0, 3)
      .join("\n\n")}`;
  }

  return `Based on your documents:\n\n${sentences.slice(0, 3).join("\n\n")}`;
}

function buildWhyResponse(sentences, context) {
  // Look for explanatory content
  const whySentences = sentences.filter((s) => {
    const lower = s.toLowerCase();
    return (
      lower.includes("because") ||
      lower.includes("since") ||
      lower.includes("reason") ||
      lower.includes("purpose") ||
      lower.includes("goal") ||
      lower.includes("objective") ||
      lower.includes("due to") ||
      lower.includes("in order to")
    );
  });

  if (whySentences.length > 0) {
    return `According to your documents:\n\n${whySentences
      .slice(0, 3)
      .join("\n\n")}`;
  }

  return `According to your documents:\n\n${sentences
    .slice(0, 3)
    .join("\n\n")}`;
}

function buildWhenWhereResponse(sentences, context, questionLower) {
  const isWhen = questionLower.includes("when");
  const isWhere = questionLower.includes("where");

  // Look for temporal or location information
  const relevantSentences = sentences.filter((s) => {
    const lower = s.toLowerCase();
    if (isWhen) {
      return (
        lower.includes("time") ||
        lower.includes("date") ||
        lower.includes("when") ||
        lower.includes("during") ||
        lower.includes("before") ||
        lower.includes("after")
      );
    }
    if (isWhere) {
      return (
        lower.includes("location") ||
        lower.includes("directory") ||
        lower.includes("path") ||
        lower.includes("where") ||
        lower.includes("environment") ||
        lower.includes("system")
      );
    }
    return false;
  });

  if (relevantSentences.length > 0) {
    return `Based on your documents:\n\n${relevantSentences
      .slice(0, 3)
      .join("\n\n")}`;
  }

  return `Based on your documents:\n\n${sentences.slice(0, 3).join("\n\n")}`;
}

function buildGeneralResponse(question, sentences, context) {
  // Extract key terms from the question
  const questionWords = question
    .toLowerCase()
    .split(/\s+/)
    .filter(
      (word) =>
        word.length > 3 &&
        !["what", "how", "why", "when", "where", "does", "this"].includes(word)
    );

  // Find sentences that contain question keywords
  const relevantSentences = sentences.filter((s) => {
    const lower = s.toLowerCase();
    return questionWords.some((word) => lower.includes(word));
  });

  if (relevantSentences.length > 0) {
    return `Based on your documents:\n\n${relevantSentences
      .slice(0, 4)
      .join("\n\n")}`;
  }

  // Fallback to most relevant content
  return `Based on your documents:\n\n${sentences.slice(0, 3).join("\n\n")}`;
}

function buildFallbackResponse(sentences) {
  if (sentences.length === 0) {
    return "I found some information in your documents, but couldn't extract a clear answer to your question.";
  }
  return `Based on your documents:\n\n${sentences.slice(0, 2).join("\n\n")}`;
}

router.post("/:documentId", async (req, res) => {
  const { documentId } = req.params;

  try {
    const { fileName, fileType, s3Key } = req.body;

    if (!fileName || !fileType || !s3Key) {
      return res.status(400).json({
        error: "Missing required fields: fileName, fileType, s3Key",
      });
    }

    const existingDoc = processedDocuments.get(documentId);
    if (existingDoc && existingDoc.status === "processing") {
      return res.status(409).json({
        error: "Document is already being processed",
        document: existingDoc,
      });
    }

    const processingDoc = {
      documentId,
      fileName,
      fileType,
      s3Key,
      status: "processing",
      startedAt: new Date().toISOString(),
      progress: "Initializing...",
    };

    processedDocuments.set(documentId, processingDoc);

    res.json({
      message: "Document processing started",
      document: processingDoc,
    });

    processDocumentInBackground(documentId, fileName, fileType, s3Key);
  } catch (error) {
    console.error("Processing initialization error:", error);

    const doc = processedDocuments.get(documentId);
    if (doc) {
      doc.status = "error";
      doc.error = error.message;
      doc.errorAt = new Date().toISOString();
    }

    res.status(500).json({
      error: "Failed to start document processing",
      details: error.message,
    });
  }
});

async function processDocumentInBackground(
  documentId,
  fileName,
  fileType,
  s3Key
) {
  try {
    const updateProgress = (progress, details) => {
      const doc = processedDocuments.get(documentId);
      if (doc) {
        doc.progress = progress;
        doc.progressDetails = details;
        processedDocuments.set(documentId, doc);
      }
    };

    updateProgress("Extracting text...", "Downloading and parsing document");
    const extractionResult = await extractTextFromDocument(
      s3Key,
      fileType,
      fileName
    );

    updateProgress("Text chunked", `Created chunks`);
    const textChunks = chunkText(extractionResult.text, 400, 50);

    updateProgress(
      "Adding metadata...",
      "Enriching chunks with document information"
    );
    const chunksWithMetadata = addMetadataToChunks(textChunks, documentId, {
      fileName,
      fileType,
      ...extractionResult.metadata,
    });

    updateProgress("Generating embeddings...", "Converting text to AI vectors");
    const embeddingResult = await embeddingService.generateEmbeddingsForChunks(
      chunksWithMetadata
    );

    updateProgress("Storing vectors...", "Saving embeddings to vector store");
    const storeResult = await embeddingService.storeEmbeddings(
      embeddingResult.embeddings
    );

    documentChunks.set(documentId, chunksWithMetadata);
    const chunkingStats = getChunkingStats(chunksWithMetadata);

    const completedDoc = {
      documentId,
      fileName,
      fileType,
      s3Key,
      status: "completed",
      startedAt: processedDocuments.get(documentId).startedAt,
      completedAt: new Date().toISOString(),
      progress: "Completed",
      progressDetails: "Document processing finished successfully",
      extractionResult: {
        wordCount: extractionResult.wordCount,
        characterCount: extractionResult.characterCount,
        pages: extractionResult.pages,
        metadata: extractionResult.metadata,
        previewText: extractionResult.text.substring(0, 300) + "...",
      },
      chunkingStats,
      embeddingStats: {
        totalEmbeddings: embeddingResult.successCount,
        failedEmbeddings: embeddingResult.failureCount,
        totalTokensUsed: embeddingResult.totalTokens,
        vectorsStored: storeResult.storedCount,
      },
      totalChunks: chunksWithMetadata.length,
      processingTimeMs:
        new Date() - new Date(processedDocuments.get(documentId).startedAt),
    };

    processedDocuments.set(documentId, completedDoc);
  } catch (error) {
    console.error(`Background processing failed for ${fileName}:`, error);

    const doc = processedDocuments.get(documentId);
    if (doc) {
      doc.status = "error";
      doc.error = error.message;
      doc.errorAt = new Date().toISOString();
      doc.progress = "Error";
      doc.progressDetails = error.message;
      processedDocuments.set(documentId, doc);
    }
  }
}

router.get("/:documentId", (req, res) => {
  try {
    const { documentId } = req.params;

    const processedDoc = processedDocuments.get(documentId);
    if (!processedDoc) {
      return res.status(404).json({
        error: "Document not found",
        documentId,
      });
    }

    res.json({ document: processedDoc });
  } catch (error) {
    console.error("Status check error:", error);
    res.status(500).json({
      error: "Failed to check processing status",
      details: error.message,
    });
  }
});

router.delete("/embeddings/:documentId", async (req, res) => {
  try {
    const { documentId } = req.params;

    try {
      const result = await embeddingService.deleteDocumentEmbeddings(
        documentId
      );

      res.json({
        message: "Document embeddings cleared successfully",
        documentId,
        result,
      });
    } catch (embeddingError) {
      res.json({
        message: "No embeddings found to clear (this is normal)",
        documentId,
        warning: embeddingError.message,
      });
    }
  } catch (error) {
    console.error("Clear embeddings error:", error);
    res.status(500).json({
      error: "Failed to clear document embeddings",
      details: error.message,
    });
  }
});

router.delete("/:documentId", async (req, res) => {
  try {
    const { documentId } = req.params;

    const processedDoc = processedDocuments.get(documentId);
    const fileName = processedDoc?.fileName || "Unknown Document";

    const hadProcessedDoc = processedDocuments.has(documentId);
    processedDocuments.delete(documentId);

    const hadChunks = documentChunks.has(documentId);
    documentChunks.delete(documentId);

    let embeddingsCleared = false;
    try {
      const result = await embeddingService.deleteDocumentEmbeddings(
        documentId
      );
      embeddingsCleared = true;
    } catch (embeddingError) {
      console.error(
        `Failed to clear embeddings for ${documentId}:`,
        embeddingError
      );
    }

    const deletionSummary = {
      documentId,
      fileName,
      storageCleared: {
        processedDocuments: hadProcessedDoc,
        documentChunks: hadChunks,
        embeddings: embeddingsCleared,
      },
      remainingDocs: processedDocuments.size,
      remainingChunks: documentChunks.size,
    };

    if (!embeddingsCleared) {
      console.warn(
        `WARNING: Embeddings may not have been cleared for ${documentId}. AI may still find this document in future searches.`
      );
    }

    res.json({
      message: "Document deletion completed",
      ...deletionSummary,
    });
  } catch (error) {
    console.error("Delete processed document error:", error);
    res.status(500).json({
      error: "Failed to delete processed document",
      details: error.message,
    });
  }
});

module.exports = router;
