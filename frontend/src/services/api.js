// frontend/src/services/api.js
import axios from "axios";

const API_BASE_URL = "http://localhost:3001/api";

// Create axios instance with longer timeout for file uploads
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 second timeout for file uploads
});

// Add request interceptor for debugging
api.interceptors.request.use((request) => {
  console.log("🔥 API Request:", request.method?.toUpperCase(), request.url);
  return request;
});

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log("✅ API Response:", response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error(
      "❌ API Error:",
      error.response?.status,
      error.response?.data || error.message
    );
    return Promise.reject(error);
  }
);

// Test backend connection
export const testConnection = async () => {
  try {
    const response = await api.get("/health");
    return response.data;
  } catch (error) {
    console.error("Backend connection failed:", error);
    throw error;
  }
};

// File upload functions
export const getUploadUrl = async (fileName, fileType, fileSize) => {
  try {
    console.log("📤 Requesting upload URL for:", fileName);
    const response = await api.post("/upload", {
      fileName,
      fileType,
      fileSize,
    });
    return response.data;
  } catch (error) {
    console.error("Get upload URL failed:", error);
    throw error;
  }
};

export const uploadToS3 = async (uploadUrl, file, onProgress) => {
  try {
    console.log("☁️ Uploading to S3:", file.name);

    // Upload directly to S3 using the presigned URL
    await axios.put(uploadUrl, file, {
      headers: {
        "Content-Type": file.type,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      },
    });

    console.log("✅ S3 upload completed for:", file.name);
  } catch (error) {
    console.error("S3 upload failed:", error);
    throw error;
  }
};

export const completeUpload = async (documentId) => {
  try {
    console.log("🏁 Completing upload for document:", documentId);
    const response = await api.post("/upload/complete", { documentId });
    return response.data;
  } catch (error) {
    console.error("Complete upload failed:", error);
    throw error;
  }
};

export const getDocuments = async () => {
  try {
    const response = await api.get("/upload/documents");
    return response.data;
  } catch (error) {
    console.error("Get documents failed:", error);
    throw error;
  }
};

export const deleteDocument = async (documentId) => {
  try {
    console.log("🗑️ Deleting document:", documentId);
    const response = await api.delete(`/upload/document/${documentId}`);
    return response.data;
  } catch (error) {
    console.error("Delete document failed:", error);
    throw error;
  }
};

export const getUploadStatus = async (documentId) => {
  try {
    const response = await api.get(`/upload/status/${documentId}`);
    return response.data;
  } catch (error) {
    console.error("Get upload status failed:", error);
    throw error;
  }
};

// Document processing functions
export const processDocument = async (
  documentId,
  fileName,
  fileType,
  s3Key
) => {
  try {
    console.log("🔄 Starting document processing for:", fileName);
    const response = await api.post(`/process/${documentId}`, {
      fileName,
      fileType,
      s3Key,
    });
    return response.data;
  } catch (error) {
    console.error("Process document failed:", error);
    throw error;
  }
};

export const getProcessingStatus = async (documentId) => {
  try {
    const response = await api.get(`/process/${documentId}`);
    return response.data;
  } catch (error) {
    console.error("Get processing status failed:", error);
    throw error;
  }
};

export const getDocumentChunks = async (documentId, page = 1, limit = 10) => {
  try {
    const response = await api.get(`/process/${documentId}/chunks`, {
      params: { page, limit },
    });
    return response.data;
  } catch (error) {
    console.error("Get document chunks failed:", error);
    throw error;
  }
};

export const getDocumentPreview = async (documentId) => {
  try {
    const response = await api.get(`/process/${documentId}/preview`);
    return response.data;
  } catch (error) {
    console.error("Get document preview failed:", error);
    throw error;
  }
};

export const getProcessedDocuments = async () => {
  try {
    const response = await api.get("/process");
    return response.data;
  } catch (error) {
    console.error("Get processed documents failed:", error);
    throw error;
  }
};

// Add these functions to your api.js file

// Delete processed document data
export const deleteProcessedDocument = async (documentId) => {
  try {
    console.log("🗑️ Deleting processed document:", documentId);
    const response = await api.delete(`/process/${documentId}`);
    return response.data;
  } catch (error) {
    console.error("Delete processed document failed:", error);
    throw error;
  }
};

// Comprehensive delete - removes document from ALL storage locations
export const deleteDocumentCompletely = async (documentId) => {
  try {
    console.log("🗑️ Starting complete deletion for document:", documentId);

    const results = {
      uploadDeleted: false,
      processedDeleted: false,
      errors: [],
    };

    // Delete from upload storage (main document metadata)
    try {
      await deleteDocument(documentId);
      results.uploadDeleted = true;
      console.log("✅ Deleted from upload storage");
    } catch (error) {
      console.error("❌ Failed to delete from upload storage:", error);
      results.errors.push("upload: " + error.message);
    }

    // Delete from processing storage (processed document data and chunks)
    try {
      await deleteProcessedDocument(documentId);
      results.processedDeleted = true;
      console.log("✅ Deleted from processing storage");
    } catch (error) {
      console.log(
        "ℹ️ No processed data to delete (this is normal if document was not processed)"
      );
      // This is not an error - document might not have been processed yet
    }

    console.log("✅ Complete deletion finished");
    return results;
  } catch (error) {
    console.error("Complete deletion failed:", error);
    throw error;
  }
};
