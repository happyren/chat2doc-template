import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { MarkdownLoader } from "@/utils/markdownLoader";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { PineconeClient } from '@pinecone-database/pinecone';

export class IngestService {

  private _pineconeClient: PineconeClient;

  /**
   * Service handling the document ingestion process
   */
  constructor(pineconeClient: PineconeClient) {
    this._pineconeClient = pineconeClient;
  }

  private async getPineconeIndex(pineconeIndex: string) {
    try {
      const index = this._pineconeClient.Index(pineconeIndex);

      return index;
    } catch (error) {
      console.log('error', error);
      throw new Error('Failed to initialize retrieve Pinecone Index');
    }
  }

  public async ingest(pineconeIndex: string) {
    if (!process.env.PINECONE_INDEX) {
      throw new Error('Pinecone index missing');
    }

    const directoryPath = process.env.CONTENT_DIRECTORY_PATH || '';
    const directoryLoader = new DirectoryLoader(directoryPath, {
      '.md': (path) => new MarkdownLoader(path),
    });

    const rawDocs = await directoryLoader.load();

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 100,
    });

    const docs = await textSplitter.splitDocuments(rawDocs);

    let res;
    try {
      const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY });
      res = await embeddings.embedDocuments(docs.map(d => d.pageContent));

      const index = await this.getPineconeIndex(pineconeIndex);

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

  public async delete(pineconeIndex: string) {
    if (!process.env.PINECONE_INDEX_NAMESPACE) {
      throw new Error('Pinecone index namespace missing');
    }

    const index = await this.getPineconeIndex(pineconeIndex);

    try {
      await index.delete1({ deleteAll: true, namespace: process.env.PINECONE_INDEX_NAMESPACE });

      return { success: true, status: 200 };
    } catch (error) {
      console.log(error);
      return { success: false, status: 500 };
    }
  }
}
