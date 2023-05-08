import { PineconeClient } from "@pinecone-database/pinecone";

export const initStore = (async () => {
  if (!process.env.PINECONE_ENVIRONMENT || !process.env.PINECONE_API_KEY || !process.env.PINECONE_INDEX) {
    throw new Error('Pinecone environment or api key vars missing');
  }

  try {
    const client = new PineconeClient();
    await client.init({
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT,
    });

    return client;
  } catch (error) {
    console.log('error', error);
    throw new Error('Failed to initialize Pinecone Client');
  }
})();