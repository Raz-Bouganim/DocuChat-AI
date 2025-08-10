// frontend/src/App.jsx
import { useState, useEffect } from 'react';
import { testConnection } from './services/api';
import FileUpload from './components/FileUpload';
import DocumentList from './components/DocumentList';

function App() {
    const [backendStatus, setBackendStatus] = useState('Checking...');
    const [isLoading, setIsLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Test backend connection on component load
    useEffect(() => {
        const checkBackend = async () => {
            try {
                setIsLoading(true);
                const response = await testConnection();
                setBackendStatus(`✅ Connected: ${response.message}`);
                console.log('🔗 Backend connection successful:', response);
            } catch (error) {
                console.error('Connection error:', error);
                setBackendStatus('❌ Backend connection failed');
            } finally {
                setIsLoading(false);
            }
        };

        checkBackend();
    }, []);

    // Handle successful upload
    const handleUploadComplete = (document) => {
        console.log('📄 Upload completed:', document.fileName);
        // Trigger refresh of document list
        setRefreshTrigger(prev => prev + 1);
    };

    // Handle upload start
    const handleUploadStart = (file) => {
        console.log('🚀 Upload started:', file.name);
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                DocuChat AI
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Upload documents and chat with AI about their content
                            </p>
                        </div>
                        
                        {/* Status Indicator */}
                        <div className="text-right">
                            {isLoading ? (
                                <div className="flex items-center text-yellow-600">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500 mr-2"></div>
                                    <span>Connecting...</span>
                                </div>
                            ) : backendStatus.includes('✅') ? (
                                <div className="text-green-600 flex items-center">
                                    <span className="mr-2">🟢</span>
                                    <span className="text-sm">System Online</span>
                                </div>
                            ) : (
                                <div className="text-red-600 flex items-center">
                                    <span className="mr-2">🔴</span>
                                    <span className="text-sm">System Offline</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Backend Status Section */}
                <div className="mb-8">
                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-gray-700">System Status</h3>
                                <p className="text-sm text-gray-500">Backend API connection</p>
                            </div>
                            <div>
                                {isLoading ? (
                                    <div className="flex items-center space-x-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                        <span className="text-blue-600">Checking connection...</span>
                                    </div>
                                ) : backendStatus.includes('✅') ? (
                                    <div className="text-green-600 bg-green-50 px-3 py-2 rounded border border-green-200">
                                        {backendStatus}
                                    </div>
                                ) : (
                                    <div className="text-red-600 bg-red-50 px-3 py-2 rounded border border-red-200">
                                        {backendStatus}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Only show upload interface if backend is connected */}
                {backendStatus.includes('✅') ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Upload Section */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-lg shadow-lg p-6">
                                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                                    <span className="mr-2">📤</span>
                                    Upload Documents
                                </h2>
                                <FileUpload 
                                    onUploadComplete={handleUploadComplete}
                                    onUploadStart={handleUploadStart}
                                />
                            </div>

                            {/* Instructions */}
                            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                                <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
                                    <span className="mr-2">💡</span>
                                    How it works
                                </h3>
                                <div className="space-y-2 text-blue-700 text-sm">
                                    <div className="flex items-start">
                                        <span className="mr-2">1️⃣</span>
                                        <span>Upload PDF or DOCX documents</span>
                                    </div>
                                    <div className="flex items-start">
                                        <span className="mr-2">2️⃣</span>
                                        <span>Documents are processed and stored securely</span>
                                    </div>
                                    <div className="flex items-start">
                                        <span className="mr-2">3️⃣</span>
                                        <span>Ask questions about your documents (coming soon!)</span>
                                    </div>
                                    <div className="flex items-start">
                                        <span className="mr-2">4️⃣</span>
                                        <span>Get AI-powered answers with citations</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Document List Section */}
                        <div>
                            <DocumentList refreshTrigger={refreshTrigger} />
                        </div>
                    </div>
                ) : (
                    /* Backend Offline Message */
                    <div className="text-center py-12">
                        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
                            <div className="text-6xl mb-4">🔌</div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">
                                Backend Connection Required
                            </h3>
                            <p className="text-gray-600 mb-4">
                                Please start the backend server to use the upload functionality.
                            </p>
                            <div className="bg-gray-50 p-4 rounded text-left text-sm">
                                <p className="font-semibold mb-2">To start the backend:</p>
                                <code className="block bg-gray-800 text-green-400 p-2 rounded">
                                    cd backend<br/>
                                    npm run dev
                                </code>
                            </div>
                            <button 
                                onClick={() => window.location.reload()}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                                Retry Connection
                            </button>
                        </div>
                    </div>
                )}

                {/* Development Progress */}
                <div className="mt-12 bg-white rounded-lg shadow-sm p-6">
                    <h3 className="font-semibold text-gray-700 mb-4 flex items-center">
                        <span className="mr-2">🚧</span>
                        Development Progress
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded border border-green-200">
                            <div className="text-green-500 text-2xl mb-2">✅</div>
                            <div className="font-semibold text-green-800">Frontend</div>
                            <div className="text-green-600 text-sm">React app with file upload</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded border border-green-200">
                            <div className="text-green-500 text-2xl mb-2">✅</div>
                            <div className="font-semibold text-green-800">Backend</div>
                            <div className="text-green-600 text-sm">Express API with AWS S3</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded border border-green-200">
                            <div className="text-green-500 text-2xl mb-2">✅</div>
                            <div className="font-semibold text-green-800">File Storage</div>
                            <div className="text-green-600 text-sm">AWS S3 cloud storage</div>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded border border-yellow-200">
                            <div className="text-yellow-500 text-2xl mb-2">⏳</div>
                            <div className="font-semibold text-yellow-800">AI Chat</div>
                            <div className="text-yellow-600 text-sm">Coming in Day 3-5</div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t mt-12">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="text-center text-gray-500 text-sm">
                        <p>DocuChat AI - Built with React, Node.js, and AWS</p>
                        <p className="mt-1">Day 2: File Upload System Complete! 🎉</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default App;