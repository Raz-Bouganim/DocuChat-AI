// frontend/src/components/FileUpload.jsx
import { useState, useRef } from 'react';
import { getUploadUrl, uploadToS3, completeUpload, processDocument, getProcessingStatus } from '../services/api';

const FileUpload = ({ onUploadComplete, onUploadStart }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [uploads, setUploads] = useState(new Map()); // Track multiple uploads
    const fileInputRef = useRef(null);

    // Validate file type and size
    const validateFile = (file) => {
        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain' // For testing
        ];
        
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (!allowedTypes.includes(file.type)) {
            throw new Error('Invalid file type. Only PDF and DOCX files are allowed.');
        }
        
        if (file.size > maxSize) {
            throw new Error(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB.`);
        }
        
        return true;
    };

    // Poll processing status until completion
    const pollProcessingStatus = async (uploadId, documentId) => {
        const maxPollingTime = 60000; // 60 seconds max
        const pollInterval = 2000; // Poll every 2 seconds
        const startTime = Date.now();
        
        const poll = async () => {
            try {
                const statusResult = await getProcessingStatus(documentId);
                const processingStatus = statusResult.document?.status;
                
                console.log(`📊 Processing status for ${documentId}: ${processingStatus}`);
                
                // Update upload status
                setUploads(prev => {
                    const newMap = new Map(prev);
                    const upload = newMap.get(uploadId);
                    if (upload) {
                        if (processingStatus === 'completed') {
                            upload.status = 'fully-completed';
                            upload.progress = 100;
                            upload.processingResult = statusResult.document;
                        } else if (processingStatus === 'error') {
                            upload.status = 'processing-error';
                            upload.error = statusResult.document?.error || 'Processing failed';
                        } else if (processingStatus === 'processing') {
                            upload.processingProgress = statusResult.document?.progress || 'Processing...';
                        }
                    }
                    return newMap;
                });
                
                // If completed or failed, stop polling and clean up
                if (processingStatus === 'completed' || processingStatus === 'error') {
                    console.log(`✅ Processing finished for ${documentId}: ${processingStatus}`);
                    
                    // Trigger document list refresh
                    if (processingStatus === 'completed' && onUploadComplete) {
                        const upload = uploads.get(uploadId);
                        if (upload?.document) {
                            onUploadComplete(upload.document);
                        }
                    }
                    
                    // Remove from uploads after 3 seconds
                    setTimeout(() => {
                        setUploads(prev => {
                            const newMap = new Map(prev);
                            newMap.delete(uploadId);
                            return newMap;
                        });
                    }, 3000);
                    
                    return; // Stop polling
                }
                
                // Continue polling if still processing and within time limit
                if (Date.now() - startTime < maxPollingTime) {
                    setTimeout(poll, pollInterval);
                } else {
                    console.warn(`⏰ Polling timeout for ${documentId}`);
                    setUploads(prev => {
                        const newMap = new Map(prev);
                        const upload = newMap.get(uploadId);
                        if (upload) {
                            upload.status = 'processing-timeout';
                            upload.error = 'Processing is taking longer than expected';
                        }
                        return newMap;
                    });
                }
                
            } catch (error) {
                console.error(`❌ Error polling processing status for ${documentId}:`, error);
                
                // Don't fail the upload, just stop polling
                setUploads(prev => {
                    const newMap = new Map(prev);
                    const upload = newMap.get(uploadId);
                    if (upload) {
                        upload.status = 'completed';
                        upload.error = 'Could not check processing status';
                    }
                    return newMap;
                });
            }
        };
        
        // Start polling after a short delay
        setTimeout(poll, 1000);
    };

    // Handle file upload process
    const uploadFile = async (file) => {
        const uploadId = `${file.name}-${Date.now()}`;
        
        try {
            // Validate file
            validateFile(file);
            
            // Initialize upload state
            setUploads(prev => new Map(prev).set(uploadId, {
                file,
                status: 'preparing',
                progress: 0,
                error: null
            }));
            
            if (onUploadStart) onUploadStart(file);
            
            console.log('🚀 Starting upload for:', file.name);
            
            // Step 1: Get upload URL from backend
            setUploads(prev => {
                const newMap = new Map(prev);
                const upload = newMap.get(uploadId);
                upload.status = 'getting-url';
                return newMap;
            });
            
            const { documentId, uploadUrl } = await getUploadUrl(
                file.name,
                file.type,
                file.size
            );
            
            console.log('📝 Got upload URL, documentId:', documentId);
            
            // Step 2: Upload to S3 with progress tracking
            setUploads(prev => {
                const newMap = new Map(prev);
                const upload = newMap.get(uploadId);
                upload.status = 'uploading';
                upload.documentId = documentId;
                return newMap;
            });
            
            await uploadToS3(uploadUrl, file, (progress) => {
                setUploads(prev => {
                    const newMap = new Map(prev);
                    const upload = newMap.get(uploadId);
                    if (upload) {
                        upload.progress = progress;
                    }
                    return newMap;
                });
            });
            
            console.log('☁️ S3 upload completed');
            
            // Step 3: Mark upload as complete
            setUploads(prev => {
                const newMap = new Map(prev);
                const upload = newMap.get(uploadId);
                upload.status = 'completing';
                return newMap;
            });
            
            const result = await completeUpload(documentId);
            
            console.log('☁️ S3 upload completed');
            
            // Step 4: Start document processing
            setUploads(prev => {
                const newMap = new Map(prev);
                const upload = newMap.get(uploadId);
                upload.status = 'processing';
                upload.documentId = documentId; // Store documentId for polling
                return newMap;
            });
            
            console.log('🔄 Starting document processing...');
            
            // Get the uploaded document info from result
            const uploadedDoc = result.document;
            
            try {
                await processDocument(
                    documentId, 
                    uploadedDoc.fileName, 
                    uploadedDoc.fileType, 
                    uploadedDoc.s3Key
                );
                console.log('✅ Document processing started');
                
                // Step 5: Poll for processing completion
                pollProcessingStatus(uploadId, documentId);
                
            } catch (processError) {
                console.warn('⚠️ Processing failed, but upload succeeded:', processError);
                // Mark as completed even if processing fails
                setUploads(prev => {
                    const newMap = new Map(prev);
                    const upload = newMap.get(uploadId);
                    upload.status = 'completed';
                    upload.progress = 100;
                    upload.document = result.document;
                    upload.error = 'Processing failed, but file was uploaded successfully';
                    return newMap;
                });
                
                if (onUploadComplete) onUploadComplete(result.document);
                
                // Remove from uploads after 3 seconds
                setTimeout(() => {
                    setUploads(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(uploadId);
                        return newMap;
                    });
                }, 3000);
            }
            
            if (onUploadComplete) onUploadComplete(result.document);
            
            // Remove from uploads after 3 seconds
            setTimeout(() => {
                setUploads(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(uploadId);
                    return newMap;
                });
            }, 3000);
            
        } catch (error) {
            console.error('❌ Upload failed:', error);
            setUploads(prev => {
                const newMap = new Map(prev);
                const upload = newMap.get(uploadId);
                if (upload) {
                    upload.status = 'error';
                    upload.error = error.message;
                }
                return newMap;
            });
        }
    };

    // Handle multiple files
    const handleFiles = (files) => {
        Array.from(files).forEach(file => {
            uploadFile(file);
        });
    };

    // Drag and drop handlers
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        // Only set to false if we're leaving the drop area entirely
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsDragging(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFiles(files);
        }
    };

    // File input handler
    const handleFileSelect = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFiles(files);
        }
        // Reset input so same file can be selected again
        e.target.value = '';
    };

    const getStatusMessage = (upload) => {
        switch (upload.status) {
            case 'preparing':
                return 'Preparing upload...';
            case 'getting-url':
                return 'Getting upload URL...';
            case 'uploading':
                return `Uploading... ${upload.progress}%`;
            case 'completing':
                return 'Finalizing upload...';
            case 'processing':
                return upload.processingProgress || 'Processing document...';
            case 'fully-completed':
                return 'Upload & processing completed! ✨';
            case 'processing-error':
                return 'Upload completed, but processing failed';
            case 'processing-timeout':
                return 'Upload completed, processing may still be running';
            case 'completed':
                return 'Upload completed!';
            case 'error':
                return `Error: ${upload.error}`;
            default:
                return 'Processing...';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'fully-completed':
                return 'text-green-600 bg-green-50 border-green-200';
            case 'completed':
                return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'processing-error':
            case 'error':
                return 'text-red-600 bg-red-50 border-red-200';
            case 'processing-timeout':
                return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            default:
                return 'text-blue-600 bg-blue-50 border-blue-200';
        }
    };

    return (
        <div className="space-y-4">
            {/* Upload Area */}
            <div
                className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                    transition-all duration-200 min-h-48 flex flex-col items-center justify-center
                    ${isDragging 
                        ? 'border-blue-500 bg-blue-50 scale-105' 
                        : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                    }
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <div className="space-y-4">
                    <div className="text-6xl">{isDragging ? '📂' : '📁'}</div>
                    <div>
                        <p className="text-lg font-semibold text-gray-700">
                            {isDragging ? 'Drop files here!' : 'Drop files here or click to browse'}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            Supports PDF and DOCX files up to 10MB
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Multiple files supported
                        </p>
                    </div>
                </div>
                
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </div>

            {/* Upload Progress */}
            {uploads.size > 0 && (
                <div className="space-y-2">
                    <h3 className="font-semibold text-gray-700 flex items-center">
                        <span className="mr-2">📤</span>
                        Upload Progress ({uploads.size} file{uploads.size > 1 ? 's' : ''}):
                    </h3>
                    {Array.from(uploads.values()).map((upload, index) => (
                        <div
                            key={index}
                            className={`p-3 rounded border transition-all ${getStatusColor(upload.status)}`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate" title={upload.file.name}>
                                        {upload.file.name}
                                    </p>
                                    <p className="text-sm">
                                        {getStatusMessage(upload)}
                                    </p>
                                    <p className="text-xs opacity-75">
                                        {(upload.file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    {upload.status === 'uploading' && (
                                        <div className="w-24">
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${upload.progress}%` }}
                                                ></div>
                                            </div>
                                            <div className="text-xs text-center mt-1">
                                                {upload.progress}%
                                            </div>
                                        </div>
                                    )}
                                    {(upload.status === 'fully-completed' || upload.status === 'completed') && (
                                        <div className="text-green-500 text-2xl">✅</div>
                                    )}
                                    {(upload.status === 'error' || upload.status === 'processing-error') && (
                                        <div className="text-red-500 text-2xl">❌</div>
                                    )}
                                    {upload.status === 'processing-timeout' && (
                                        <div className="text-yellow-500 text-2xl">⚠️</div>
                                    )}
                                    {(upload.status === 'preparing' || upload.status === 'getting-url' || upload.status === 'completing' || upload.status === 'processing') && (
                                        <div className="text-blue-500 text-xl animate-spin">⏳</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FileUpload;