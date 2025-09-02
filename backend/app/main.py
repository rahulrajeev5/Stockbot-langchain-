# backend/app/main.py
import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from fastapi import Body

# LangChain imports
# from langchain_community.llms.openai import OpenAI
from langchain.chains import RetrievalQAWithSourcesChain
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import UnstructuredURLLoader
# from langchain_community.embeddings import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAI, OpenAIEmbeddings


from dotenv import load_dotenv

# Load .env
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

# FastAPI app
app = FastAPI(title="StockBot: News Research Tool 📈")

# Allow CORS for frontend
origins = ["http://localhost:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Folder to save FAISS index
file_path = os.path.join(Path(__file__).parent.parent, "faiss_index")

# Pydantic models
class URLRequest(BaseModel):
    urls: List[str]

class QueryRequest(BaseModel):
    question: str

# Endpoint to process URLs
@app.post("/process-urls")
def process_urls(request: URLRequest = Body(...)):
    try:
        # Load data from URLs
        loader = UnstructuredURLLoader(urls=request.urls)
        data = loader.load()

        # Split text
        text_splitter = RecursiveCharacterTextSplitter(
            separators=['\n\n', '\n', '.', ','],
            chunk_size=1000
        )
        docs = text_splitter.split_documents(data)

        # Create embeddings and FAISS vector store
        embeddings = OpenAIEmbeddings()
        vectorstore = FAISS.from_documents(docs, embeddings)

        # Save FAISS index locally
        vectorstore.save_local(file_path)

        return {"message": "FAISS index built successfully.", "documents_count": len(docs)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint to ask question
@app.post("/ask-question")
def ask_question(request: QueryRequest = Body(...)):
    try:
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=400,
                detail="FAISS index not found. Please process URLs first."
            )

        # Load FAISS index
        embeddings = OpenAIEmbeddings()
        vectorstore = FAISS.load_local(
            file_path, 
            embeddings,
            allow_dangerous_deserialization=True)

        # Create LLM chain
        llm = OpenAI(temperature=0.9, max_tokens=500)
        chain = RetrievalQAWithSourcesChain.from_llm(
            llm=llm,
            retriever=vectorstore.as_retriever()
        )

        result = chain.invoke({"question": request.question})

        return {
            "answer": result.get("answer", ""),
            "sources": result.get("sources", "")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
