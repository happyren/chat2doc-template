// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { MarkdownLoader } from "@/utils/markdownLoader";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { PineconeClient } from '@pinecone-database/pinecone';

type Data = {
  data?: number[][] | undefined,
  result?: any
}

async function initPinecone() {
  if (!process.env.PINECONE_ENVIRONMENT || !process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
    throw new Error('Pinecone environment or api key vars missing');
  }

  try {
    const pinecone = new PineconeClient();

    await pinecone.init({
      environment: process.env.PINECONE_ENVIRONMENT,
      apiKey: process.env.PINECONE_API_KEY,
    });


    const index = pinecone.Index(process.env.PINECONE_INDEX);

    return index;
  } catch (error) {
    console.log('error', error);
    throw new Error('Failed to initialize Pinecone Client');
  }
}

async function deleteHandler(req: NextApiRequest) {
  const index = await initPinecone();

  const res = await index.delete1({ deleteAll: true, namespace: process.env.PINECONE_INDEX_NAMESPACE });

 return res;
}

async function postHandler(req: NextApiRequest) {
  if (!process.env.PINECONE_INDEX) {
    throw new Error('Pinecone index missing');
  }

  const directoryPath = process.env.CONTENT_DIRECTORY_PATH || '';
  const directoryLoader = new DirectoryLoader(directoryPath, {
    '.md': (path) => new MarkdownLoader(path),
  });

  const rawDocs = await directoryLoader.load();

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const docs = await textSplitter.splitDocuments(rawDocs);

  let res;
  try {
    const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY });
    res = await embeddings.embedDocuments(docs.map(d => d.pageContent));

    const index = await initPinecone();

    await PineconeStore.fromDocuments(docs, new OpenAIEmbeddings(), {
      pineconeIndex: index,
      namespace: process.env.PINECONE_INDEX_NAMESPACE,
      textKey: 'text',
    });
  } catch (error) {
    console.log(error);
  }

  return res;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method === 'POST') {
    const data = await postHandler(req);
    res.status(200).json({ data });
  } else if (req.method === 'DELETE') {
    const result = await deleteHandler(req);
    res.status(200).json({ result });
  }
}
