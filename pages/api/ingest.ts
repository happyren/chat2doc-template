import type { NextApiRequest, NextApiResponse } from 'next'
import { PineconeClient } from '@pinecone-database/pinecone';
import { IngestService } from '@/services/ingest';
import { initPineconeClient } from '@/utils/pineconeClient';

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

async function deleteHandler() {
  const index = await initPinecone();

  const res = await index.delete1({ deleteAll: true, namespace: process.env.PINECONE_INDEX_NAMESPACE });

 return res;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const pineconeClient = await initPineconeClient();
  const ingestService = new IngestService(pineconeClient);

  if(!process.env.PINECONE_INDEX_NAMESPACE) {
    throw new Error('Pinecone index namespace missing');
  }

  if (req.method === 'POST') {
    const data = await ingestService.ingest(process.env.PINECONE_INDEX_NAMESPACE);
    res.status(200).json({ data });
  } else if (req.method === 'DELETE') {
    const result = await deleteHandler();
    res.status(200).json({ result });
  }
}
