import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import {
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { v } from "convex/values";
import { Document } from "langchain/document";
import { TokenTextSplitter } from "langchain/text_splitter";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { generateEmbedding } from "./ai";

type DocumentMetadata = {
  title: string;
  chunkIndex: number;
  lectureId: Id<"lectures">;
};

function formatDocumentsWithMetaData(documents: Document[]): string {
  return documents
    .map((doc) => {
      return `${doc.metadata.title}\n ${doc.metadata.chunkIndex}\n {doc.pageContent}`;
    })
    .join("\n");
}

export const send = mutation({
  args: {
    message: v.string(),
    moduleId: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, { message, moduleId, sessionId }) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("User not authenticated");
    }

    const moduleUser = await ctx.db.get(moduleId as Id<"modules">);

    if (!moduleUser) {
      throw new Error("Module cannot be found.");
    }

    if (moduleUser.userId !== identity.subject) {
      throw new Error(
        "User is not authorized to send messages to this module.",
      );
    }

    await ctx.db.insert("messages", {
      isViewer: true,
      body: message,
      moduleId: moduleId as Id<"modules">,
      sessionId: sessionId,
      isPartial: false,
    });
    await ctx.scheduler.runAfter(0, internal.aiChats.answer, {
      moduleId,
      sessionId,
    });
  },
});

export const answer = internalAction({
  args: {
    moduleId: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const { moduleId, sessionId } = args;

    // Fetch messages and lectures
    const messages = await ctx.runQuery(internal.aiChats.getMessages, {
      moduleId,
      sessionId,
    });
    const lastUserMessage = messages.at(-1)!.body;
    const lastUserMessageEmbedding = await generateEmbedding(lastUserMessage);
    const lecturesSearchResult = await ctx.vectorSearch(
      "lectures",
      "by_lectureTranscriptionEmbedding",
      {
        vector: lastUserMessageEmbedding,
        limit: 5,
      },
    );
    const lectureIds = lecturesSearchResult.map((lecture) => lecture._id);
    const lectures = await ctx.runQuery(
      internal.lectures.getLecturesByIdsInternal,
      { lectureIds },
    );
    const moduleLectures = lectures.filter(
      (lecture) => lecture.moduleId === moduleId,
    );

    const textSplitter = new TokenTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    // Fetch transcriptions and create documents
    const documents = await Promise.all(
      moduleLectures.map(async (lecture) => {
        if (
          lecture.lectureData.transcriptionChunks &&
          lecture.lectureData.transcriptionChunks.length > 0
        ) {
          const transcription = await ctx.runAction(
            internal.lectures.fetchTranscription,
            {
              transcriptionIds: lecture.lectureData.transcriptionChunks,
            },
          );

          const chunks = await textSplitter.createDocuments(
            [transcription],
            [{ lectureId: lecture._id, title: lecture.title }],
          );

          return chunks.map((chunk, index) => ({
            pageContent: chunk.pageContent,
            metadata: {
              lectureId: lecture._id,
              title: lecture.title,
              chunkIndex: index,
            },
          }));
        }
        return [];
      }),
    );

    const validDocuments = documents
      .flat()
      .filter((doc): doc is Document<DocumentMetadata> => doc !== null);

    let messageId: Id<"messages"> | null = null;

    messageId = await ctx.runMutation(internal.aiChats.saveAIResponse, {
      sessionId,
      response: "",
      moduleId,
      isPartial: false,
    });

    try {
      // Set up LangChain components
      const llm = new ChatOpenAI({
        model: "gpt-3.5-turbo",
        temperature: 0,
        streaming: true,
      });
      const vectorStore = await MemoryVectorStore.fromDocuments(
        validDocuments,
        new OpenAIEmbeddings(),
      );
      const retriever = vectorStore.asRetriever();

      // Set up prompts
      const contextualizeQSystemPrompt = `Given a chat history and the latest user question
    which might reference context in the chat history, formulate a standalone question
    which can be understood without the chat history. Do NOT answer the question,
    just reformulate it if needed and otherwise return it as is.`;

      const contextualizeQPrompt = ChatPromptTemplate.fromMessages([
        ["system", contextualizeQSystemPrompt],
        new MessagesPlaceholder("chat_history"),
        ["human", "{question}"],
      ]);

      const qaSystemPrompt = `You are an AI tutor assisting a student with their university module.

      Use the following lecture notes and materials uploaded by the student to answer their questions.

      Provide clear and detailed explanations to help them understand the topic.

      If appropriate, reference the lecture materials.

      If you don't know the answer, or it is not in the provided materials, express that and encourage the student to seek further assistance.
      
      Make the answer more direct without unacessary comments and unacessary details.

      Make sure the answer is less than 40 words.
      {context}`;

      const qaPrompt = ChatPromptTemplate.fromMessages([
        ["system", qaSystemPrompt],

        new MessagesPlaceholder("chat_history"),

        ["human", "{question}"],
      ]);

      // Set up chains
      const contextualizeQChain = contextualizeQPrompt
        .pipe(llm)
        .pipe(new StringOutputParser());

      const contextualizedQuestion = async (
        input: Record<string, unknown>,
      ): Promise<string> => {
        if (
          "chat_history" in input &&
          input.question &&
          typeof input.question === "string"
        ) {
          const result = await contextualizeQChain.invoke(input);
          return typeof result === "string" ? result : JSON.stringify(result);
        }
        return typeof input.question === "string" ? input.question : "";
      };

      const ragChain = RunnableSequence.from([
        RunnablePassthrough.assign({
          context: async (input: {
            chat_history?: BaseMessage[];
            question: string;
          }) => {
            if (input.chat_history && input.chat_history.length > 0) {
              const contextualizedQ = await contextualizedQuestion(input);
              const relevantDocs =
                await retriever._getRelevantDocuments(contextualizedQ);
              return formatDocumentsWithMetaData(relevantDocs);
            }
            return "";
          },
        }),
        qaPrompt,
        llm,
      ]);

      // Prepare chat history
      const chat_history = messages
        .slice(0, -1)
        .map((msg) =>
          msg.isViewer ? new HumanMessage(msg.body) : new AIMessage(msg.body),
        );

      let fullResponse = "";

      // Invoke the RAG chain with streaming
      const stream = await ragChain.stream({
        question: lastUserMessage,
        chat_history,
      });

      for await (const chunk of stream) {
        fullResponse += chunk.content;

        // Save or update the partial response
        if (!messageId) {
          messageId = await ctx.runMutation(internal.aiChats.saveAIResponse, {
            moduleId,
            response: fullResponse,
            sessionId,
            isPartial: true,
          });
        } else {
          await ctx.runMutation(internal.aiChats.updateBotMessage, {
            messageId,
            body: fullResponse,
          });
        }
      }

      // Save the final response
      await ctx.runMutation(internal.aiChats.updateBotMessage, {
        messageId: messageId!,
        body: fullResponse,
        isPartial: false,
      });
    } catch (err: unknown) {
      await ctx.runMutation(internal.aiChats.updateBotMessage, {
        messageId,
        body: "I cannot reply at this time. Reach out to the team on our support lines.",
      });
      throw err;
    }
  },
});

// Add this new mutation to save the AI's response
export const saveAIResponse = internalMutation({
  args: {
    moduleId: v.string(),
    response: v.string(),
    sessionId: v.string(),
    isPartial: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { moduleId, response, sessionId, isPartial } = args;
    return await ctx.db.insert("messages", {
      isViewer: false,
      body: response,
      moduleId: moduleId as Id<"modules">,
      sessionId,
      isPartial,
    });
  },
});

export const list = query({
  args: {
    moduleId: v.id("modules"),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("bySessionAndModule", (q) =>
        q.eq("sessionId", args.sessionId).eq("moduleId", args.moduleId),
      )
      .collect();

    // Filter out partial messages except for the last one
    const filteredMessages = messages.filter(
      (msg, index) => !msg.isPartial || index === messages.length - 1,
    );

    return filteredMessages;
  },
});

export const clearAllChats = mutation({
  args: {
    moduleId: v.id("modules"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("byModuleId", (q) => q.eq("moduleId", args.moduleId))
      .collect();

    await Promise.all(messages.map((message) => ctx.db.delete(message._id)));
  },
});

export const clear = mutation({
  args: {
    moduleId: v.id("modules"),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("bySessionAndModule", (q) =>
        q.eq("sessionId", args.sessionId).eq("moduleId", args.moduleId),
      )
      .collect();
    await Promise.all(messages.map((message) => ctx.db.delete(message._id)));
  },
});

export const getMessages = internalQuery({
  args: {
    moduleId: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("bySessionAndModule", (q) =>
        q
          .eq("sessionId", args.sessionId)
          .eq("moduleId", args.moduleId as Id<"modules">),
      )
      .collect();
  },
});

export const updateBotMessage = internalMutation(
  async (
    ctx,
    {
      messageId,
      body,
      isPartial,
    }: { messageId: Id<"messages">; body: string; isPartial?: boolean },
  ) => {
    await ctx.db.patch(messageId, { body, isPartial: isPartial ?? false });
  },
);

export const listLastMessagesPerSession = query({
  args: { moduleId: v.id("modules") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("byModuleId", (q) => q.eq("moduleId", args.moduleId))
      .order("desc")
      .collect();

    const lastMessagesPerSession = new Map();
    for (const message of messages) {
      if (!lastMessagesPerSession.has(message.sessionId)) {
        lastMessagesPerSession.set(message.sessionId, message);
      }
    }

    return Array.from(lastMessagesPerSession.values());
  },
});
