# ![DocuChat AI Logo](frontend/public/docuchat-favicon.svg) DocuChat AI 

**AI-powered document chat application that lets you upload documents and have intelligent conversations about their content.**

## 🎯 Purpose

DocuChat AI transforms how you interact with your documents. Instead of manually searching through PDFs and DOCX files, simply upload them and ask questions in natural language. The AI analyzes your documents and provides contextual answers with source references.

**Why I Built This:** This project was created as a learning exercise to explore and practice modern web development, AI integration, and coding technologies.

## ✨ Features

- 📤 **Document Upload**: Support for PDF and DOCX files
- 🔍 **Intelligent Search**: Vector based similarity search through document content
- 💬 **Natural Chat Interface**: Ask questions about your documents in plain English
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🗂️ **Document Management**: Upload, view, and delete documents with ease
- ⚡ **Real-time Processing**: Live status updates during document processing
- 🎨 **Modern UI**: Clean, professional interface with collapsible sidebar
- 🔒 **Complete Cleanup**: Proper document deletion from all storage systems

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI library with hooks
- **Vite** - Fast development build tool
- **Tailwind CSS** - Utility first CSS framework
- **JavaScript ES6+** - Modern JavaScript features

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **AWS S3** - File storage service
- **In-memory Vector Store** - Document embedding storage
- **Development Embedding Service** - Custom embedding generation

### Document Processing
- **Text Extraction** - PDF and DOCX content parsing
- **Text Chunking** - Intelligent document segmentation
- **Vector Embeddings** - Semantic search capabilities
- **RAG (Retrieval-Augmented Generation)** - Context aware responses

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- AWS S3 bucket (for file storage)
- Basic understanding of environment variables

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Raz-Bouganim/DocuChat-AI.git
   cd DocuChat-AI
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Configure environment variables**
   
   Create `backend/.env` file:
   Then edit `backend/.env` with your actual credentials:
   ```env
   # AWS S3 Configuration (replace with your actual AWS credentials)
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_aws_access_key_here
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
   AWS_S3_BUCKET=your-unique-bucket-name
   
   # Server Configuration
   PORT=3001
   ```
   
5. **Start the development servers**
   
   Backend (Terminal 1):
   ```bash
   cd backend
   npm run dev
   ```
   
   Frontend (Terminal 2):
   ```bash
   cd frontend
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to `http://localhost:5173` and start chatting with your documents!

## 📖 How to Use

1. **Upload Documents**: Click the "+" button to upload PDF or DOCX files
2. **Wait for Processing**: Documents are automatically processed and indexed
3. **Start Chatting**: Ask questions about your documents in the chat interface
4. **Get Answers**: Receive intelligent responses with source references
5. **Manage Documents**: View, select, or delete documents from the sidebar

### Example Questions
- "What is this document about?"
- "What are the main requirements?"
- "How should I implement this feature?"
- "What are the key findings?"
- "Summarize the main points"

## ⚠️ AI Response Disclaimer

**Important Notice**: This application uses a basic rule based AI response system for document analysis. The responses are generated through text processing and pattern matching rather than advanced AI models like GPT-4. 

**Limitations**:
- Responses may not always be perfectly accurate or contextually complete
- The AI cannot understand complex reasoning or nuanced interpretations
- Always verify important information from the original source documents
- This system is designed for general document exploration, not critical decision-making

**Educational Purpose**: This project prioritizes learning and experimentation over production grade AI capabilities.

## 🏗️ Project Structure

```
docuchat-ai/
├── frontend/                 # React frontend application
│   ├── public/              # Static assets and favicon
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API communication
│   │   └── main.jsx         # Application entry point
│   └── package.json
├── backend/                  # Node.js backend server
│   ├── api/                 # Express route handlers
│   ├── utils/               # Utility functions and services
│   ├── index.js             # Server entry point
│   └── package.json
├── .gitignore
└── README.md
```

## 🔧 Configuration Options

### Document Processing
- **Chunk Size**: 400 words (configurable)
- **Overlap**: 50 words between chunks
- **File Size Limit**: 10MB per document
- **Supported Formats**: PDF, DOCX

### Search Settings
- **Similarity Threshold**: 0.15 (adjustable for search sensitivity)
- **Max Results**: 8 chunks per search
- **Retry Threshold**: 0.05 (fallback for difficult queries)

### From App Image:
<p align="center">
  <img src="https://github.com/user-attachments/assets/488b6daa-61f9-4483-8309-bfd8a793a661" alt="Project Screenshot" width="80%">
</p>

