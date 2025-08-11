import { useState, useEffect, useRef } from "react";
import { testConnection, getProcessedDocuments } from "./services/api";
import FileUpload from "./components/FileUpload";
import DocumentList from "./components/DocumentList";
import ChatInterface from "./components/ChatInterface";

function App() {
  const [backendStatus, setBackendStatus] = useState("Checking...");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [processedDocuments, setProcessedDocuments] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);

  // Load processed documents
  const loadProcessedDocuments = async () => {
    try {
      const result = await getProcessedDocuments();
      setProcessedDocuments(result.documents || []);
    } catch (error) {
      console.error("Failed to load processed documents:", error);
    }
  };

  useEffect(() => {
    const checkBackend = async () => {
      try {
        setIsLoading(true);
        const response = await testConnection();
        setBackendStatus(`✅ Connected: ${response.message}`);
        await loadProcessedDocuments();
      } catch (error) {
        console.error("Connection error:", error);
        setBackendStatus("❌ Backend connection failed");
      } finally {
        setIsLoading(false);
      }
    };

    checkBackend();
  }, []);

  const handleUploadComplete = (document) => {
    setRefreshTrigger((prev) => prev + 1);
    setTimeout(() => loadProcessedDocuments(), 2000);
  };

  const handleUploadStart = (file) => {
    console.log("Upload started:", file.name);
  };

  const handleDocumentDeleted = async () => {
    setRefreshTrigger((prev) => prev + 1);
    await loadProcessedDocuments();
  };

  const handleChatMessage = (message, response) => {
    console.log("Chat:", message, "→", response);
  };

  // Get status display info
  const getStatusDisplay = () => {
    if (isLoading) {
      return {
        color: "text-yellow-600",
        bgColor: "bg-yellow-50",
        text: "Connecting...",
        showSpinner: true,
      };
    } else if (backendStatus.includes("✅")) {
      return {
        color: "text-green-600",
        bgColor: "bg-green-50",
        text: "Connected",
        showSpinner: false,
      };
    } else {
      return {
        color: "text-red-600",
        bgColor: "bg-red-50",
        text: "Offline",
        showSpinner: false,
      };
    }
  };

  const statusInfo = getStatusDisplay();

  // Instructions Modal Component
  const InstructionsModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-800">About DocuChat AI</h3>
          <button
            onClick={() => setShowInstructions(false)}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-500"
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
          </button>
        </div>

        {/* App Description */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-800 mb-3">
            What is DocuChat AI?
          </h4>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            DocuChat AI is an intelligent document conversation platform that
            allows you to upload your documents and have natural conversations
            about their content. Using advanced AI technology, it analyzes your
            documents and provides accurate answers with source citations.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            Perfect for research, document analysis, studying, and quickly
            finding information within large documents.
          </p>
        </div>

        {/* How it Works */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-800 mb-3">How it Works</h4>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
                1
              </div>
              <div>
                <div className="font-medium text-gray-800">
                  Upload Documents
                </div>
                <div className="text-sm text-gray-600">
                  Upload your PDF or DOCX files using the + button
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
                2
              </div>
              <div>
                <div className="font-medium text-gray-800">
                  Automatic Processing
                </div>
                <div className="text-sm text-gray-600">
                  Documents are automatically analyzed and indexed for AI
                  conversations
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
                3
              </div>
              <div>
                <div className="font-medium text-gray-800">Start Chatting</div>
                <div className="text-sm text-gray-600">
                  Ask questions about your documents in natural language
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
                4
              </div>
              <div>
                <div className="font-medium text-gray-800">
                  Get Intelligent Answers
                </div>
                <div className="text-sm text-gray-600">
                  Receive accurate responses with citations to source material
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright and Footer */}
        <div className="border-t pt-4 mt-6">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-2">
              © {new Date().getFullYear()} DocuChat AI. All rights reserved.
            </p>
            <p className="text-xs text-gray-400">
              Built with React, Node.js, and AI technologies
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowInstructions(false)}
          className="w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  );

  // Upload Button
  const InteractiveUploadButton = () => {
    const [isPressed, setIsPressed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const fileInputRef = useRef(null);

    const triggerFileInput = () => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    };

    const handleFileChange = (e) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        const hiddenFileInput = document.querySelector(
          '#hidden-file-upload input[type="file"]'
        );
        if (hiddenFileInput) {
          // Create a new file list and assign it
          const dt = new DataTransfer();
          Array.from(files).forEach((file) => dt.items.add(file));
          hiddenFileInput.files = dt.files;

          const event = new Event("change", { bubbles: true });
          hiddenFileInput.dispatchEvent(event);
        }
      }
      e.target.value = "";
    };

    return (
      <>
        <button
          onClick={triggerFileInput}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onMouseLeave={() => {
            setIsPressed(false);
            setIsHovered(false);
          }}
          onMouseEnter={() => setIsHovered(true)}
          className={`w-12 h-12 rounded-xl border-2 border-dashed transition-all duration-200 flex items-center justify-center transform ${
            isPressed
              ? "scale-95 border-blue-500 bg-blue-100 shadow-inner"
              : isHovered
              ? "scale-105 border-blue-400 bg-blue-50 shadow-md"
              : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
          }`}
          title="Upload documents (PDF, DOCX)"
        >
          <svg
            className={`w-6 h-6 transition-all duration-200 ${
              isPressed
                ? "text-blue-700 scale-90"
                : isHovered
                ? "text-blue-600 scale-110"
                : "text-gray-600"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx"
          onChange={handleFileChange}
          className="hidden"
        />
      </>
    );
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm flex-shrink-0 h-16">
        <div className="px-6 py-4 h-full">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-5 h-5 flex flex-col justify-center space-y-1">
                  <div
                    className={`w-full h-0.5 bg-gray-600 transition-transform ${
                      sidebarOpen ? "rotate-45 translate-y-1.5" : ""
                    }`}
                  />
                  <div
                    className={`w-full h-0.5 bg-gray-600 transition-opacity ${
                      sidebarOpen ? "opacity-0" : ""
                    }`}
                  />
                  <div
                    className={`w-full h-0.5 bg-gray-600 transition-transform ${
                      sidebarOpen ? "-rotate-45 -translate-y-1.5" : ""
                    }`}
                  />
                </div>
              </button>

              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  DocuChat AI
                </h1>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowInstructions(true)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="About DocuChat AI"
              >
                <svg
                  className="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {backendStatus.includes("✅") ? (
        <div
          className="flex-1 flex overflow-hidden"
          style={{ height: "calc(100vh - 4rem)" }}
        >
          {/* Collapsible Sidebar */}
          <aside
            className={`bg-white border-r border-gray-200 shadow-sm transition-all duration-300 flex-shrink-0 ${
              sidebarOpen ? "w-64" : "w-0"
            } overflow-hidden h-full`}
          >
            <div className="h-full flex flex-col">
              {/* Upload Section */}
              <div className="p-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-800">
                    Upload
                  </h2>
                </div>
                <div className="flex items-center space-x-3">
                  <InteractiveUploadButton />
                  <div className="text-xs text-gray-500">
                    Add PDF or DOCX files
                  </div>
                </div>
                {/* Hidden FileUpload component to handle actual upload logic */}
                <div id="hidden-file-upload" className="hidden">
                  <FileUpload
                    onUploadComplete={handleUploadComplete}
                    onUploadStart={handleUploadStart}
                  />
                </div>
              </div>

              {/* Document Library */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-800">
                      Documents
                    </h2>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {processedDocuments.length}
                    </span>
                  </div>
                  <DocumentList
                    refreshTrigger={refreshTrigger}
                    onDocumentDeleted={handleDocumentDeleted}
                  />
                </div>
              </div>
            </div>
          </aside>

          {/* Main Chat Area */}
          <main className="flex-1 h-full overflow-hidden">
            <div className="h-full">
              <ChatInterface
                documents={processedDocuments}
                onChatMessage={handleChatMessage}
              />
            </div>
          </main>
        </div>
      ) : (
        /* Backend Offline Message */
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto text-center">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Backend Connection Required
            </h3>
            <p className="text-gray-600 mb-6">
              Please start the backend server to use the application.
            </p>

            <div className="bg-gray-50 p-4 rounded-lg text-left text-sm mb-6">
              <p className="font-semibold mb-2 text-gray-700">
                To start the backend:
              </p>
              <code className="block bg-gray-800 text-green-400 p-3 rounded font-mono text-xs">
                cd backend
                <br />
                npm run dev
              </code>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Instructions Modal */}
      {showInstructions && <InstructionsModal />}

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm lg:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
