// frontend/src/components/DocumentList.jsx
import { useState, useEffect } from 'react';
import { getDocuments, deleteDocument, getProcessedDocuments } from '../services/api';
import ProcessingStatus from './ProcessingStatus';

const DocumentList = ({ refreshTrigger }) => {
    const [documents, setDocuments] = useState([]);
    const [processedDocs, setProcessedDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [selectedDocId, setSelectedDocId] = useState(null);

    // Load documents and processed documents
    const loadDocuments = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('📄 Loading documents...');
            
            // Load both uploaded and processed documents
            const [uploadResult, processResult] = await Promise.all([
                getDocuments(),
                getProcessedDocuments()
            ]);
            
            setDocuments(uploadResult.documents || []);
            setProcessedDocs(processResult.documents || []);
            
            console.log('✅ Loaded', uploadResult.documents?.length || 0, 'uploaded documents');
            console.log('✅ Loaded', processResult.documents?.length || 0, 'processed documents');
        } catch (err) {
            console.error('Failed to load documents:', err);
            setError('Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    // Load documents on component mount and when refreshTrigger changes
    useEffect(() => {
        loadDocuments();
    }, [refreshTrigger]);

    // Auto-refresh for documents that are still processing
    useEffect(() => {
        const processingDocs = processedDocs.filter(doc => doc.status === 'processing');
        
        if (processingDocs.length === 0) {
            return; // No documents processing, no need to poll
        }
        
        console.log(`🔄 Found ${processingDocs.length} documents still processing, setting up auto-refresh...`);
        
        const interval = setInterval(() => {
            console.log('🔄 Auto-refreshing processing status...');
            loadDocuments();
        }, 3000); // Refresh every 3 seconds
        
        return () => {
            console.log('🛑 Stopping auto-refresh');
            clearInterval(interval);
        };
    }, [processedDocs]); // Re-run when processedDocs changes

    // Get processing status for a document
    const getProcessingInfo = (documentId) => {
        return processedDocs.find(doc => doc.documentId === documentId);
    };

    // Handle viewing processing status
    const handleViewProcessing = (documentId, fileName) => {
        setSelectedDocId(documentId);
    };

    // Handle document deletion
    const handleDelete = async (documentId, fileName) => {
        if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
            return;
        }

        try {
            setDeletingId(documentId);
            console.log('🗑️ Deleting document:', fileName);
            await deleteDocument(documentId);
            
            // Remove from local state
            setDocuments(prev => prev.filter(doc => doc.id !== documentId));
            console.log('✅ Document deleted successfully');
        } catch (err) {
            console.error('Failed to delete document:', err);
            alert('Failed to delete document. Please try again.');
        } finally {
            setDeletingId(null);
        }
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            return 'Today ' + date.toLocaleTimeString();
        } else if (diffDays === 2) {
            return 'Yesterday ' + date.toLocaleTimeString();
        } else if (diffDays <= 7) {
            return diffDays + ' days ago';
        } else {
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        }
    };

    // Get file type icon and info
    const getFileInfo = (fileType, fileName) => {
        if (fileType.includes('pdf')) {
            return { icon: '📄', type: 'PDF', color: 'text-red-600 bg-red-50' };
        }
        if (fileType.includes('word') || fileType.includes('document')) {
            return { icon: '📝', type: 'DOCX', color: 'text-blue-600 bg-blue-50' };
        }
        if (fileType.includes('text')) {
            return { icon: '📄', type: 'TXT', color: 'text-gray-600 bg-gray-50' };
        }
        return { icon: '📁', type: 'FILE', color: 'text-gray-600 bg-gray-50' };
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">📚</span>
                    Your Documents
                </h2>
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-2 text-gray-600">Loading documents...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <span className="mr-2">📚</span>
                    Your Documents
                </h2>
                <div className="text-red-600 bg-red-50 p-4 rounded border border-red-200">
                    <div className="flex items-center">
                        <span className="text-xl mr-2">❌</span>
                        <div>
                            <p className="font-semibold">Error loading documents</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    </div>
                    <button 
                        onClick={loadDocuments}
                        className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                    <span className="mr-2">📚</span>
                    Your Documents
                    {documents.length > 0 && (
                        <span className="ml-2 px-2 py-1 bg-gray-100 text-sm rounded-full">
                            {documents.length}
                        </span>
                    )}
                    {processedDocs.filter(doc => doc.status === 'processing').length > 0 && (
                        <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full animate-pulse">
                            {processedDocs.filter(doc => doc.status === 'processing').length} processing
                        </span>
                    )}
                </h2>
                <button 
                    onClick={loadDocuments}
                    className={`px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors flex items-center ${
                        loading ? 'animate-pulse' : ''
                    }`}
                    disabled={loading}
                >
                    <span className={`mr-1 ${loading ? 'animate-spin' : ''}`}>🔄</span>
                    {loading ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {documents.length === 0 ? (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">📂</div>
                    <p className="text-gray-500 text-lg font-medium">No documents uploaded yet</p>
                    <p className="text-gray-400 text-sm mt-2">
                        Upload your first PDF or DOCX file to get started with document chat
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {documents.map((doc) => {
                        const fileInfo = getFileInfo(doc.fileType, doc.fileName);
                        const processingInfo = getProcessingInfo(doc.id);
                        
                        return (
                            <div 
                                key={doc.id} 
                                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-2xl">{fileInfo.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-gray-900 truncate" title={doc.fileName}>
                                                    {doc.fileName}
                                                </h3>
                                                <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${fileInfo.color}`}>
                                                        {fileInfo.type}
                                                    </span>
                                                    <span>{formatFileSize(doc.fileSize)}</span>
                                                    <span>📅 {formatDate(doc.uploadedAt)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center space-x-2 ml-4">
                                        {/* Processing Status Button */}
                                        {processingInfo ? (
                                            <button
                                                onClick={() => handleViewProcessing(doc.id, doc.fileName)}
                                                className={`px-3 py-1 text-sm rounded transition-colors ${
                                                    processingInfo.status === 'completed' 
                                                        ? 'text-green-600 hover:bg-green-50 border border-green-200'
                                                        : processingInfo.status === 'processing'
                                                        ? 'text-blue-600 hover:bg-blue-50 border border-blue-200 animate-pulse'
                                                        : 'text-red-600 hover:bg-red-50 border border-red-200'
                                                }`}
                                                title={`View processing details - Status: ${processingInfo.status}`}
                                            >
                                                {processingInfo.status === 'completed' && (
                                                    <span className="flex items-center">
                                                        <span className="mr-1">✅</span>
                                                        Processed ({processingInfo.totalChunks} chunks)
                                                    </span>
                                                )}
                                                {processingInfo.status === 'processing' && (
                                                    <span className="flex items-center">
                                                        <span className="mr-1 animate-spin">🔄</span>
                                                        Processing...
                                                    </span>
                                                )}
                                                {processingInfo.status === 'error' && (
                                                    <span className="flex items-center">
                                                        <span className="mr-1">❌</span>
                                                        Error
                                                    </span>
                                                )}
                                            </button>
                                        ) : (
                                            <span className="px-3 py-1 text-sm text-gray-500 bg-gray-100 rounded">
                                                Not processed
                                            </span>
                                        )}
                                        
                                        <button
                                            onClick={() => handleDelete(doc.id, doc.fileName)}
                                            disabled={deletingId === doc.id}
                                            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                                            title="Delete document"
                                        >
                                            {deletingId === doc.id ? (
                                                <span className="flex items-center">
                                                    <span className="animate-spin mr-1">⏳</span>
                                                    Deleting...
                                                </span>
                                            ) : (
                                                <span className="flex items-center">
                                                    <span className="mr-1">🗑️</span>
                                                    Delete
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Document stats */}
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        {processingInfo ? (
                                            processingInfo.status === 'completed' ? (
                                                <span>✅ Ready for AI chat • {processingInfo.totalChunks} chunks</span>
                                            ) : processingInfo.status === 'processing' ? (
                                                <span>🔄 Processing text...</span>
                                            ) : processingInfo.status === 'error' ? (
                                                <span>❌ Processing failed</span>
                                            ) : (
                                                <span>⏳ Processing status unknown</span>
                                            )
                                        ) : (
                                            <span>⏳ Waiting for processing</span>
                                        )}
                                        <span>ID: {doc.id.slice(0, 8)}...</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {/* Processing Status Modal */}
            {selectedDocId && (
                <ProcessingStatus 
                    documentId={selectedDocId}
                    fileName={documents.find(doc => doc.id === selectedDocId)?.fileName || 'Unknown'}
                    onClose={() => setSelectedDocId(null)}
                />
            )}
        </div>
    );
};

export default DocumentList;