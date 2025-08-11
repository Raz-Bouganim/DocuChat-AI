// DocumentList component for sidebar
import { useState, useEffect } from "react";
import {
  getDocuments,
  getProcessedDocuments,
  deleteDocumentCompletely,
} from "../services/api";

const DocumentList = ({ refreshTrigger, onDocumentDeleted }) => {
  const [documents, setDocuments] = useState([]);
  const [processedDocs, setProcessedDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const [uploadResult, processResult] = await Promise.all([
        getDocuments(),
        getProcessedDocuments(),
      ]);

      setDocuments(uploadResult.documents || []);
      setProcessedDocs(processResult.documents || []);
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [refreshTrigger]);

  useEffect(() => {
    const processingDocs = processedDocs.filter(
      (doc) => doc.status === "processing"
    );
    if (processingDocs.length === 0) return;

    const interval = setInterval(loadDocuments, 3000);
    return () => clearInterval(interval);
  }, [processedDocs]);

  const getProcessingStatus = (docId) => {
    const processed = processedDocs.find((p) => p.documentId === docId);
    return processed?.status || "uploaded";
  };

  const getFileIcon = (fileName) => {
    if (fileName.toLowerCase().endsWith(".pdf")) return "📄";
    if (fileName.toLowerCase().endsWith(".docx")) return "📝";
    return "📄";
  };

  const truncateFileName = (fileName, maxLength = 35) => {
    if (fileName.length <= maxLength) return fileName;
    const extension = fileName.split(".").pop();
    const nameWithoutExt = fileName.slice(0, fileName.lastIndexOf("."));
    const truncated =
      nameWithoutExt.slice(0, maxLength - extension.length - 4) + "...";
    return `${truncated}.${extension}`;
  };

  const handleDelete = async (docId, fileName) => {
    if (!window.confirm(`Delete "${fileName}"?`)) return;

    setDeletingId(docId);
    try {
      const results = await deleteDocumentCompletely(docId);

      if (results.uploadDeleted) {
        if (onDocumentDeleted) {
          await onDocumentDeleted();
        }
      } else {
        console.warn("Some deletion operations failed:", results.errors);
      }

      loadDocuments();
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete document. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-400";
      case "processing":
        return "bg-yellow-400";
      case "error":
        return "bg-red-400";
      default:
        return "bg-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center space-x-2 p-2">
              <div className="w-4 h-4 bg-gray-200 rounded"></div>
              <div className="flex-1 h-3 bg-gray-200 rounded"></div>
              <div className="w-2 h-2 bg-gray-200 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-lg mb-2">📁</div>
        <p className="text-xs text-gray-500">No documents yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Upload files to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {documents.map((doc) => {
        const status = getProcessingStatus(doc.id);
        const isDeleting = deletingId === doc.id;

        return (
          <div
            key={doc.id}
            className="group flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <span className="text-sm flex-shrink-0">
                {getFileIcon(doc.fileName)}
              </span>

              <div className="flex-1 min-w-0">
                <p
                  className="text-xs font-medium text-gray-700 truncate"
                  title={doc.fileName}
                >
                  {truncateFileName(doc.fileName)}
                </p>

                {status === "processing" && (
                  <p className="text-xs text-yellow-600 flex items-center">
                    <span className="w-1 h-1 bg-yellow-400 rounded-full mr-1 animate-pulse"></span>
                    Processing...
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-1">
              {/* Status indicator */}
              <div
                className={`w-2 h-2 rounded-full ${getStatusColor(status)}`}
                title={`Status: ${status}`}
              />

              {/* Delete button - on hover */}
              <button
                onClick={() => handleDelete(doc.id, doc.fileName)}
                disabled={isDeleting}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all duration-200"
                title="Delete document"
              >
                {isDeleting ? (
                  <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg
                    className="w-3 h-3 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DocumentList;
