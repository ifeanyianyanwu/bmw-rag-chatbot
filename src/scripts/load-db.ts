import { DataAPIClient } from "@datastax/astra-db-ts";
import { PuppeteerWebBaseLoader } from "langchain/document_loaders/web/puppeteer";
import { OpenAI } from "openai";
import { GoogleGenAI } from "@google/genai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import "dotenv/config";

type SimilarityMetric = "dot_product" | "euclidean" | "cosine";

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_APPLICATION_TOKEN,
  ASTRA_DB_API_ENDPOINT,
  OPENAI_API_KEY,
  GOOGLE_GENAI_API_KEY,
} = process.env;

const ai = new GoogleGenAI({ apiKey: GOOGLE_GENAI_API_KEY });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const bmwData = [
  "https://www.bmw.com/en/index.html",
  "https://www.bmwgroup.com/en.html",
  "https://www.bmw-m.com/en/index.html",
  "https://en.wikipedia.org/wiki/BMW",
];

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE });

const splitter = new RecursiveCharacterTextSplitter({
  chunkOverlap: 100,
  chunkSize: 512,
});

const createCollection = async (
  similarityMetric: SimilarityMetric = "dot_product"
) => {
  const res = await db.createCollection(ASTRA_DB_COLLECTION, {
    vector: { dimension: 768, metric: similarityMetric },
  });
};

const loadSampleData = async () => {
  const collection = db.collection(ASTRA_DB_COLLECTION);
  for await (const url of bmwData) {
    const content = await scrapePage(url);
    const chunks = await splitter.splitText(content);
    for await (const chunk of chunks) {
      const embedding = await ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: chunk,
        config: { outputDimensionality: 768 },
      });

      const vector = embedding.embeddings;

      const res = collection.insertOne({ $vector: vector, text: chunk });
      console.log(res);
    }
  }
};

const scrapePage = (url: string) => {
  return "";
};
