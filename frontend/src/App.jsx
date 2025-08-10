import { useState, useEffect } from 'react'
import { testConnection } from './services/api'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [backendStatus, setBackendStatus] = useState('Checking...');

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await testConnection();
        setBackendStatus(`✅ Connected: ${response.message}`);
      } catch (error) {
        setBackendStatus(`❌ Backend connection failed`);
      }
    };

    checkBackend();
  }, []);

  return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-lg">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">
                    DocuChat AI
                </h1>
                <p className="text-gray-600 mb-4">
                    Full-stack document chat application
                </p>
                <div className="bg-gray-50 p-4 rounded">
                    <p className="font-semibold">Backend Status:</p>
                    <p>{backendStatus}</p>
                </div>
            </div>
        </div>
    );
}

export default App
