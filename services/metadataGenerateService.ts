import { Document } from 'langchain/document';
import { Configuration, OpenAIApi } from 'openai';

export const MetadataGenerateService = (() => {
  const LABEL_GENERATE_PROMPT = `
    Your task is to extract information out of a document \
    then generate labels for classifying and corelate documents \
    so different documents can share a pool of labels and corresponding \
    strength of each document relate to a label.

    the document will be delimited by <>.

    Take the top ten labels and provide the strength.

    The labels will be in JSON format, with label as key and strength as value.

    Only return JSON labels, in exact format as below.

    Context:
    <{context}>
  `;

  const configuration =  new Configuration({
    apiKey: process.env.OPENAI_API_KEY || '',
  });

  const openai = new OpenAIApi(configuration);

  const generateLabel = async (doc: Document) => {
    const content = LABEL_GENERATE_PROMPT.replace('{context}', doc.pageContent);

    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{role: "user", content}],
      temperature: 0.3
    });

    const result = completion.data.choices[0].message;
    return result && JSON.parse(result['content']);
  }

  const labelDocs = async (rawDocs: Document[]) => {
    const docs = await Promise.all(rawDocs.map(async (doc) => {
      const labels = await generateLabel(doc);
      doc.metadata.labels = labels;
      return doc;
    }));

    return docs;
  }

  return { labelDocs };
});