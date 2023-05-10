import type { NextApiRequest, NextApiResponse } from 'next';
import { IngestService } from '@/services/ingestService';
import { initPineconeClient } from '@/utils/pineconeClient';

type Data = {
  data?: number[][] | undefined,
  success?: boolean
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const pineconeClient = await initPineconeClient();
  const ingestService = IngestService(pineconeClient);

  if(!process.env.PINECONE_INDEX) {
    throw new Error('Pinecone index missing');
  }

  if (req.method === 'POST') {
    const data = await ingestService.ingest(process.env.PINECONE_INDEX);
    res.status(200).json({ data });
  } else if (req.method === 'DELETE') {
    const result = await ingestService.deleteNamespace(process.env.PINECONE_INDEX);
    res.status(result.status).json({ success: result.success });
  }
}
