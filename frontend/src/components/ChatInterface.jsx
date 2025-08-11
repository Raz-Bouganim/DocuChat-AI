import { useState, useRef, useEffect } from "react";

const ChatInterface = ({ documents, onChatMessage }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState("all");
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setIsLoading(true);

    const newUserMessage = {
      id: Date.now(),
      type: "user",
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newUserMessage]);

    try {
      const response = await fetch("http://localhost:3001/api/process/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          documentId: selectedDocument === "all" ? null : selectedDocument,
          conversationHistory: messages.slice(-6),
          maxChunks: 5,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `Chat request failed with status ${response.status}`
        );
      }

      const aiMessage = {
        id: Date.now() + 1,
        type: "assistant",
        content: result.answer,
        sources: result.sources || [],
        relevantChunks: result.relevantChunks,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (onChatMessage) {
        onChatMessage(userMessage, result);
      }
    } catch (error) {
      console.error("Chat error:", error);

      const errorMessage = {
        id: Date.now() + 1,
        type: "error",
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const processedDocs = documents.filter(
    (doc) => doc.status === "completed" || doc.processingStatus === "completed"
  );

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b p-3 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Document selector */}
            <select
              value={selectedDocument}
              onChange={(e) => setSelectedDocument(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={processedDocs.length === 0}
            >
              <option value="all">
                All Documents ({processedDocs.length})
              </option>
              {processedDocs.map((doc) => (
                <option key={doc.documentId} value={doc.documentId}>
                  {doc.fileName}
                </option>
              ))}
            </select>
          </div>

          {/* Clear chat button */}
          <button
            onClick={clearChat}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Clear chat history"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ minHeight: 0 }}
      >
        {processedDocs.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📄</div>
            <p className="text-gray-500 text-lg">No processed documents yet</p>
            <p className="text-gray-400 text-sm mt-2">
              Upload and process documents first to start chatting
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🤖</div>
            <p className="text-gray-500 text-lg">Start a conversation!</p>
            <p className="text-gray-400 text-sm mt-2">
              Ask questions about your documents and I'll help you find answers.
            </p>

            {/* Example questions */}
            <div className="mt-6 space-y-2">
              <p className="text-gray-600 font-medium">Try asking:</p>
              <div className="space-y-1 text-sm text-gray-500">
                <div>"What is this document about?"</div>
                <div>"Summarize the main points"</div>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.type === "user"
                    ? "bg-blue-600 text-white"
                    : message.type === "error"
                    ? "bg-red-100 text-red-800 border border-red-200"
                    : "bg-gray-100 text-gray-800 border"
                }`}
              >
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </div>

                {/* Simple source indicator for AI messages */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2 text-xs text-gray-400">
                    Source:{" "}
                    {[...new Set(message.sources.map((s) => s.source))].join(
                      ", "
                    )}
                  </div>
                )}

                <div
                  className={`text-xs mt-2 opacity-75 ${
                    message.type === "user" ? "text-blue-200" : "text-gray-500"
                  }`}
                >
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl px-4 py-3 border">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
                <span className="text-sm text-gray-600">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t p-4 bg-white">
        {processedDocs.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            <p>Upload and process documents to start chatting</p>
          </div>
        ) : (
          <>
            <div className="flex space-x-2">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question about your documents..."
                className="flex-1 resize-none border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="2"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  "Send"
                )}
              </button>
            </div>

            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>Press Enter to send, Shift+Enter for new line</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
