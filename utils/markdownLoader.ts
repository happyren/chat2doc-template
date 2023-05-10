import { Document } from 'langchain/document';
import { readFile } from 'fs/promises';
import { BaseDocumentLoader } from 'langchain/document_loaders/base';

export abstract class TextLoader extends BaseDocumentLoader {
  constructor(public filePathOrBlob: string | Blob) {
    super();
    console.log(filePathOrBlob);
  }

  protected abstract parse(
    raw: string,
    metadata: Record<string, any>
  ): Promise<Document[]>;

  public async load(): Promise<Document[]> {
    let raw: string;
    let metadata: Record<string, string>;
    if (typeof this.filePathOrBlob === 'string') {
      raw = await readFile(this.filePathOrBlob, 'utf-8');
      metadata = { source: this.filePathOrBlob };
    } else {
      raw = '';
      console.error('files are not accepted');
    }
    return this.parse(raw, {
      source: this.filePathOrBlob
    });
  }
}

export class MarkdownLoader extends TextLoader {
  public async parse(
    raw: string,
    metadata: Record<string, any>,
  ): Promise<Document[]> {
    const lines = raw.split('\r\n');
    const documents: Document[] = [];
    const content = lines.reduce((prev, curr) => {
      if (curr === '' || curr.startsWith('---')) {
        return prev;
      } else {
        return prev + curr.replace(/#*/g, '') + ' ';
      }
    }, '');
    const doc = new Document({
      pageContent: content,
      metadata: {
        ...metadata,
        shortDesc: lines[0]
      }
    });

    documents.push(doc);
    return documents;
  }
}