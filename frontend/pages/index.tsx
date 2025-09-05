// pages/index.tsx
import { useState } from "react";
import axios from "axios";
import { TextField, Button, Typography, Box, Card, CardContent } from "@mui/material";

export default function Home() {
  const [urls, setUrls] = useState(["", "", ""]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);


  // Handle URL input change
  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  // Call FastAPI to process URLs and build FAISS index
const processUrls = async () => {
  setLoading(true);
  setProgress(["Data Loading...Started.."]);

  try {
    const res = await axios.post("http://localhost:8000/process-urls", { urls });

    // simulate multiple stages like Streamlit
    setProgress(prev => [...prev, "Text Splitter...Started...✅✅✅"]);
    await new Promise(r => setTimeout(r, 1000));

    setProgress(prev => [...prev, "Embedding Vector Started Building...✅✅✅"]);
    await new Promise(r => setTimeout(r, 1000));

    setProgress(prev => [...prev, `✅ Done! Documents count: ${res.data.documents_count}`]);
  } catch (error) {
    console.error(error);
    setProgress(prev => [...prev, "❌ Error processing URLs. Check backend logs."]);
  }

  setLoading(false);
};


  // Call FastAPI to ask question
  const askQuestion = async () => {
    if (!question) {
      alert("Please enter a question");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post("http://localhost:8000/ask-question", { question });
      setAnswer(res.data.answer);
      setSources(res.data.sources ? res.data.sources.split("\n") : []);
    } catch (error) {
      console.error(error);
      alert("Error fetching answer. Check your backend logs.");
    }
    setLoading(false);
  };

  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant="h3" gutterBottom>
        StockBot: News Research Tool 📈
      </Typography>

      <Typography variant="h5" gutterBottom>
        Enter Article URLs:
      </Typography>

      {urls.map((url, idx) => (
        <TextField
          key={idx}
          label={`URL ${idx + 1}`}
          fullWidth
          margin="normal"
          value={url}
          onChange={(e) => handleUrlChange(idx, e.target.value)}
        />
      ))}

      <Button
        variant="contained"
        color="primary"
        onClick={processUrls}
        disabled={loading}
        sx={{ mt: 2 }}
      >
        {loading ? "Processing..." : "Process URLs"}
      </Button>
     
    <Box mt={2}>
      {progress.map((msg, i) => (
        <Typography key={i} variant="body2">
          {msg}
        </Typography>
      ))}
    </Box>
    
      <Box mt={4}>
        <TextField
          label="Ask a Question"
          fullWidth
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <Button
          variant="contained"
          color="secondary"
          onClick={askQuestion}
          sx={{ mt: 2 }}
          disabled={loading}
        >
          {loading ? "Fetching..." : "Get Answer"}
        </Button>
      </Box>

      {answer && (
        <Card sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h6">Answer:</Typography>
            <Typography>{answer}</Typography>

            {sources.length > 0 && (
              <>
                <Typography variant="subtitle1" mt={2}>
                  Sources:
                </Typography>
                {sources.map((src, i) => (
                  <Typography key={i}>{src}</Typography>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
