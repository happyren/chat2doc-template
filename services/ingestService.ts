import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { MarkdownLoader } from "@/utils/markdownLoader";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { PineconeClient } from '@pinecone-database/pinecone';
import { Document } from 'langchain/document';
import { MetadataGenerateService } from "./metadataGenerateService";

export const IngestService = ((pineconeClient: PineconeClient, metadataGenerateService: typeof MetadataGenerateService) => {
  const _pineconeClient = pineconeClient;
  const _metadataGenerateService = metadataGenerateService();

  const getPineconeIndex = async (pineconeIndex: string) => {
    try {
      const index = _pineconeClient.Index(pineconeIndex);

      return index;
    } catch (error) {
      console.log('error', error);
      throw new Error('Failed to initialize retrieve Pinecone Index');
    }
  }

  const loadRawDocs = async () => {
    const directoryPath = process.env.CONTENT_DIRECTORY_PATH || '';
    const directoryLoader = new DirectoryLoader(directoryPath, {
      '.md': (path) => new MarkdownLoader(path),
    });

    const rawDocs = await directoryLoader.load();
    return rawDocs;
  }

  const splitDocs = async (rawDocs: Document[]) => {
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await textSplitter.splitDocuments(rawDocs);
    return docs;
  }

  const ingest = async (pineconeIndex: string) => {
    if (!process.env.PINECONE_INDEX) {
      throw new Error('Pinecone index missing');
    }

    const rawDocs = await loadRawDocs();

    const docs = await splitDocs(rawDocs);

    const metaDoc = await _metadataGenerateService.labelDocs(docs);

    let res;
    try {
      const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY });

      const index = await getPineconeIndex(pineconeIndex);

      await PineconeStore.fromDocuments(metaDoc, new OpenAIEmbeddings(), {
        pineconeIndex: index,
        namespace: process.env.PINECONE_INDEX_NAMESPACE,
        textKey: 'text',
      });
    } catch (error) {
      console.log(error);
    }
    
    return res;
  }

  const deleteNamespace = async (pineconeIndex: string) => {
    if (!process.env.PINECONE_INDEX_NAMESPACE) {
      throw new Error('Pinecone index namespace missing');
    }

    const index = await getPineconeIndex(pineconeIndex);

    try {
      await index.delete1({ deleteAll: true, namespace: process.env.PINECONE_INDEX_NAMESPACE });

      return { success: true, status: 200 };
    } catch (error) {
      console.log(error);
      return { success: false, status: 500 };
    }
  }

  return { ingest, deleteNamespace };
});
