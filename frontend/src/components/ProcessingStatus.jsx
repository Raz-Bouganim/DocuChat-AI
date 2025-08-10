// frontend/src/components/ProcessingStatus.jsx
import { useState, useEffect } from 'react';
import { getProcessingStatus, getDocumentPreview, getDocumentChunks } from '../services/api';

const ProcessingStatus = ({ documentId, fileName, onClose }) => {
    const [status, setStatus] = useState(null);
    const [preview, setPreview] = useState(null);
    const [chunks, setChunks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('status');

    // Poll for processing status
    useEffect(() => {
        if (!documentId) return;

        const checkStatus = async () => {
            try {
                const result = await getProcessingStatus(documentId);
                setStatus(result.document);
                
                // If processing is complete, load preview and chunks
                if (result.document.status === 'completed') {
                    try {
                        const previewResult = await getDocumentPreview(documentId);
                        setPreview(previewResult);
                        
                        const chunksResult = await getDocumentChunks(documentId, 1, 5);
                        setChunks(chunksResult.chunks || []);
                    } catch (error) {
                        console.error('Failed to load preview/chunks:', error);
                    }
                }
            } catch (error) {
                console.error('Failed to check processing status:', error);
            } finally {
                setLoading(false);
            }
        };

        // Initial check
        checkStatus();

        // Poll every 2 seconds if still processing
        const interval = setInterval(() => {
            if (status && status.status === 'processing') {
                checkStatus();
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [documentId, status?.status]);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'processing': return '🔄';
            case 'completed': return '✅';
            case 'error': return '❌';
            default: return '⏳';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'processing': return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'completed': return 'text-green-600 bg-green-50 border-green-200';
            case 'error': return 'text-red-600 bg-red-50 border-red-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        <span className="ml-2">Loading processing status...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (!status) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                    <div className="text-center">
                        <div className="text-red-500 text-4xl mb-2">❌</div>
                        <p>Processing status not found</p>
                        <button 
                            onClick={onClose}
                            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden mx-4">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Document Processing</h2>
                        <p className="text-gray-600 text-sm mt-1">{fileName}</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                        ×
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b">
                    <button 
                        onClick={() => setActiveTab('status')}
                        className={`px-6 py-3 font-medium ${
                            activeTab === 'status' 
                                ? 'text-blue-600 border-b-2 border-blue-600' 
                                : 'text-gray-600 hover:text-gray-800'
                        }`}
                    >
                        Status
                    </button>
                    {status.status === 'completed' && (
                        <>
                            <button 
                                onClick={() => setActiveTab('preview')}
                                className={`px-6 py-3 font-medium ${
                                    activeTab === 'preview' 
                                        ? 'text-blue-600 border-b-2 border-blue-600' 
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                Preview
                            </button>
                            <button 
                                onClick={() => setActiveTab('chunks')}
                                className={`px-6 py-3 font-medium ${
                                    activeTab === 'chunks' 
                                        ? 'text-blue-600 border-b-2 border-blue-600' 
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                Chunks
                            </button>
                        </>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {activeTab === 'status' && (
                        <div className="space-y-4">
                            {/* Current Status */}
                            <div className={`p-4 rounded border ${getStatusColor(status.status)}`}>
                                <div className="flex items-center">
                                    <span className="text-2xl mr-3">{getStatusIcon(status.status)}</span>
                                    <div>
                                        <div className="font-semibold capitalize">{status.status}</div>
                                        <div className="text-sm">{status.progress || 'Processing...'}</div>
                                        {status.progressDetails && (
                                            <div className="text-xs mt-1 opacity-75">{status.progressDetails}</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Processing Timeline */}
                            <div className="bg-gray-50 rounded p-4">
                                <h3 className="font-semibold mb-3">Processing Timeline</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span>Started:</span>
                                        <span>{new Date(status.startedAt).toLocaleString()}</span>
                                    </div>
                                    {status.completedAt && (
                                        <div className="flex justify-between">
                                            <span>Completed:</span>
                                            <span>{new Date(status.completedAt).toLocaleString()}</span>
                                        </div>
                                    )}
                                    {status.processingTimeMs && (
                                        <div className="flex justify-between">
                                            <span>Processing Time:</span>
                                            <span>{(status.processingTimeMs / 1000).toFixed(1)}s</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Statistics */}
                            {status.extractionResult && (
                                <div className="bg-gray-50 rounded p-4">
                                    <h3 className="font-semibold mb-3">Document Statistics</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="font-medium">Pages:</span>
                                            <span className="ml-2">{status.extractionResult.pages}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium">Words:</span>
                                            <span className="ml-2">{status.extractionResult.wordCount?.toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium">Characters:</span>
                                            <span className="ml-2">{status.extractionResult.characterCount?.toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium">Chunks:</span>
                                            <span className="ml-2">{status.totalChunks}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Chunk Statistics */}
                            {status.chunkingStats && (
                                <div className="bg-gray-50 rounded p-4">
                                    <h3 className="font-semibold mb-3">Chunking Statistics</h3>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="font-medium">Total Tokens:</span>
                                            <span className="ml-2">{status.chunkingStats.totalTokens?.toLocaleString()}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium">Avg Tokens/Chunk:</span>
                                            <span className="ml-2">{status.chunkingStats.avgTokensPerChunk}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium">Min Tokens:</span>
                                            <span className="ml-2">{status.chunkingStats.minTokensPerChunk}</span>
                                        </div>
                                        <div>
                                            <span className="font-medium">Max Tokens:</span>
                                            <span className="ml-2">{status.chunkingStats.maxTokensPerChunk}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Error Details */}
                            {status.status === 'error' && status.error && (
                                <div className="bg-red-50 border border-red-200 rounded p-4">
                                    <h3 className="font-semibold text-red-800 mb-2">Error Details</h3>
                                    <p className="text-red-700 text-sm">{status.error}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'preview' && preview && (
                        <div className="space-y-4">
                            <div className="bg-gray-50 rounded p-4">
                                <h3 className="font-semibold mb-3">Document Preview</h3>
                                <div className="bg-white border rounded p-4 text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
                                    {preview.previewText}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'chunks' && chunks.length > 0 && (
                        <div className="space-y-4">
                            <div className="bg-gray-50 rounded p-4">
                                <h3 className="font-semibold mb-3">Text Chunks (First 5)</h3>
                                <div className="space-y-3">
                                    {chunks.map((chunk, index) => (
                                        <div key={index} className="bg-white border rounded p-3">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-medium text-sm">Chunk {chunk.chunkIndex + 1}</span>
                                                <div className="text-xs text-gray-500">
                                                    {chunk.tokenCount} tokens, {chunk.wordCount} words
                                                </div>
                                            </div>
                                            <div className="text-sm whitespace-pre-wrap bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                                                {chunk.text.substring(0, 300)}
                                                {chunk.text.length > 300 && '...'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t p-4 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProcessingStatus;