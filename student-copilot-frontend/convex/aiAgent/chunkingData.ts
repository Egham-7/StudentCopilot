
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

export async function chunker(text: string): Promise<string[]> {
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 400,
        chunkOverlap: 30,
      });
    const output = await splitter.createDocuments([text]);
    let arr:string[] = []; 
    output.forEach((doc) => {
      arr.push(doc.pageContent);
  });
    return arr;
}

