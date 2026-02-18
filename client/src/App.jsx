import { useState } from 'react';

function App() {
  const [aiResponse, setAiResponse] = useState("Waiting for AI...");
  const [loading, setLoading] = useState(false);

  const testServer = async () => {
    setLoading(true);
    setAiResponse("Asking the server...");
    try {
      // 1. Call your Node Server (not OpenAI directly!)
      const response = await fetch('http://localhost:5000/api/ai-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      // 2. Get the JSON answer
      const data = await response.json();

      // 3. Show it on the screen
      if (data.message) {
        setAiResponse("🤖 AI Says: " + data.message);
      } else {
        setAiResponse("❌ Error: " + JSON.stringify(data));
      }
    } catch (error) {
      setAiResponse("❌ Failed to connect to server.");
    }
    setLoading(false);
  };

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-gray-50 p-4 space-y-6">
      <h1 className="text-4xl font-bold text-navy">NexBA System Check</h1>
      
      {/* AI Test Button */}
      <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md text-center">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">Test AI Integration</h2>
        
        <p className="mb-4 text-gray-600 italic border p-4 rounded bg-gray-50 min-h-[80px] flex items-center justify-center">
          {aiResponse}
        </p>

        <button 
          onClick={testServer}
          disabled={loading}
          className={`px-6 py-3 rounded-lg text-white font-medium transition-all ${
            loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-blue-700 shadow-md hover:shadow-lg'
          }`}
        >
          {loading ? "Thinking..." : "Ask Backend for AI Haiku"}
        </button>
      </div>
    </div>
  );
}

export default App;