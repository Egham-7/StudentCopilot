import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query
} from "./_generated/server";
import { generateEmbedding } from "./ai";
import { exponentialBackoff } from "./utils";

export const storeClient = mutation({
  args: {
    lectureIds: v.array(v.id("lectures")),
    moduleId: v.id("modules"),
  },
  handler: async (ctx, args) => {
    // Schedule the fetch and process action

    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authorized to use this endpoint.");
    }

    const user = await ctx.db.query("users").withIndex("by_clerkId").first();

    if (!user) {
      throw new Error("User not found.");
    }

    const moduleUser = await ctx.db.get(args.moduleId);

    if (!moduleUser) {
      throw new Error("Module not found.");
    }

    if (moduleUser.userId !== identity.subject) {
      throw new Error("Not allowed to create notes for this module.");
    }

    await ctx.scheduler.runAfter(
      0,
      internal.notes.fetchAndProcessTranscriptions,
      {
        lectureIds: args.lectureIds,
        noteTakingStyle: user.noteTakingStyle,
        learningStyle: user.learningStyle,
        course: user.course,
        levelOfStudy: user.levelOfStudy,
      },
    );

    return {
      success: true,
      message: "Lecture transcription processing scheduled.",
    };
  },
});

export const fetchAndProcessTranscriptions = internalAction({
  args: {
    lectureIds: v.array(v.id("lectures")),
    noteTakingStyle: v.string(),
    learningStyle: v.union(
      v.literal("auditory"),
      v.literal("visual"),
      v.literal("kinesthetic"),
      v.literal("analytical"),
    ),
    course: v.string(),
    levelOfStudy: v.union(
      v.literal("Bachelors"),
      v.literal("Associate"),
      v.literal("Masters"),
      v.literal("PhD"),
    ),
  },
  handler: async (ctx, args) => {
    const transcriptionChunks: string[] = [];

    for (const lectureId of args.lectureIds) {
      const lecture = await ctx.runQuery(internal.notes.getLecture, {
        lectureId,
      });
      if (!lecture) {
        throw new Error(`Lecture with ID ${lectureId} not found.`);
      }

      for (const chunkId of lecture.lectureTranscription) {
        const chunkUrl = await ctx.storage.getUrl(chunkId);
        if (!chunkUrl) {
          throw new Error(`Transcription chunk with ID ${chunkId} not found.`);
        }

        const response = await fetch(chunkUrl);
        const chunkText = await response.text();
        transcriptionChunks.push(chunkText);
      }
    }

    // Schedule the note generation task
    await ctx.scheduler.runAfter(0, internal.notes.generateNotes, {
      transcriptionChunks,
      lectureIds: args.lectureIds,
      noteTakingStyle: args.noteTakingStyle,
      learningStyle: args.learningStyle,
      course: args.course,
      levelOfStudy: args.levelOfStudy,
    });
  },
});

export const getLecture = internalQuery({
  args: { lectureId: v.id("lectures") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.lectureId);
  },
});

export const generateNotes = internalAction({
  args: {
    transcriptionChunks: v.array(v.string()),
    lectureIds: v.array(v.id("lectures")),
    noteTakingStyle: v.string(),
    learningStyle: v.union(
      v.literal("auditory"),
      v.literal("visual"),
      v.literal("kinesthetic"),
      v.literal("analytical"),
    ),
    course: v.string(),
    levelOfStudy: v.union(
      v.literal("Bachelors"),
      v.literal("Associate"),
      v.literal("Masters"),
      v.literal("PhD"),
    ),
  },
  handler: async (ctx, args) => {
    const {
      transcriptionChunks,
      noteTakingStyle,
      learningStyle,
      course,
      levelOfStudy,
    } = args;

    // Process chunks in parallel

    const chunkPromises = transcriptionChunks.map(async (chunk) => {
      return exponentialBackoff(async () => {
        const noteChunk = await processChunk(chunk, {
          noteTakingStyle,
          learningStyle,
          course,
          levelOfStudy,
        });
        const noteChunkBlob = new Blob([noteChunk], { type: "text/plain" });
        const storageId = await ctx.storage.store(noteChunkBlob);

        // Generate embedding for the chunk
        const embedding = await generateEmbedding(noteChunk);

        return { storageId, embedding };
      });
    });

    const processedChunks = await Promise.all(chunkPromises);

    const noteChunkIds: Id<"_storage">[] = [];
    const allEmbeddings: number[][] = [];

    for (const { storageId, embedding } of processedChunks) {
      noteChunkIds.push(storageId);
      allEmbeddings.push(embedding);
    }

    // Concatenate embeddings into a single 1536-dimensional vector
    const concatenatedEmbedding: number[] = [];
    for (let i = 0; i < 1536; i++) {
      const sum = allEmbeddings.reduce(
        (acc, embedding) => acc + (embedding[i] || 0),
        0,
      );
      concatenatedEmbedding.push(sum / allEmbeddings.length);
    }

    // Store the list of note chunk IDs and the concatenated embedding in the database
    await ctx.runMutation(internal.notes.storeNotes, {
      noteChunkIds: noteChunkIds,
      lectureIds: args.lectureIds,
      embedding: concatenatedEmbedding,
    });
  },
});

export const storeNotes = internalMutation({
  args: {
    noteChunkIds: v.array(v.id("_storage")),
    lectureIds: v.array(v.id("lectures")),
    embedding: v.array(v.float64()),
  },
  handler: async (ctx, args) => {
    const firstLectureId = args.lectureIds[0];

    const firstLecture = await ctx.db.get(firstLectureId);

    if (firstLecture == null) {
      throw new Error("Lectures must be present for notes.");
    }

    const moduleId = firstLecture?.moduleId;

    const moduleUser = await ctx.db.get(moduleId);

    if (moduleUser == null) {
      throw new Error("Module cannot be null.");
    }

    const noteId = await ctx.db.insert("notes", {
      textChunks: args.noteChunkIds,
      lectureIds: args.lectureIds,
      moduleId: moduleId,
      noteEmbedding: args.embedding,
    });

    // Create a notification for the user
    await ctx.db.insert("notifications", {
      userId: moduleUser.userId,
      message: `Notes have been generated for ${moduleUser.name}`,
      type: "note_generation",
      relatedId: noteId,
      createdAt: new Date().toISOString(),
      isRead: false,
    });
  },
});

async function processChunk(
  chunk: string,
  userInfo: {
    noteTakingStyle: string;
    learningStyle: "auditory" | "visual" | "kinesthetic" | "analytical";
    levelOfStudy: "Bachelors" | "Associate" | "Masters" | "PhD";
    course: string;
  },
): Promise<string> {

  return exponentialBackoff(async () => {
    const prompt: string = `
    Your task is to:
    1. Analyze the given lecture chunk thoroughly.
    2. Create a comprehensive summary in Markdown format, adapting to the user's note-taking and learning style.
    3. Use appropriate Markdown syntax for headings, subheadings, lists, and emphasis.
    4. Highlight key concepts, definitions, and important points.
    5. Organize the information logically and hierarchically.
    6. Include any relevant examples or case studies mentioned.
    7. If applicable, add bullet points for easy readability.
    8. Ensure the notes are concise yet informative, appropriate for the user's level of study.
    9. Use code blocks for any multiline code content.
    10. Use markdown math syntax that is compatible with Katex for math formulas and equations.
    11. End with a brief "Key Takeaways" section if appropriate.
    12. For visual learners, include suggestions for diagrams or visual aids where applicable.
    13. For auditory learners, emphasize key phrases or mnemonics that could be easily remembered.
    14. For kinesthetic learners, suggest practical applications or hands-on activities related to the content.
    15. For analytical learners, include logical breakdowns and connections between concepts.
    Produce notes that would be valuable for review and quick reference, tailored to the user's specific needs and the course content. If the lecture chunk appears to be cut off mid-sentence or mid-thought, please use your best judgment to infer the intended meaning and complete the idea logically. Do not leave any sentences or thoughts unfinished in your summary.`;
    const question: string = `Please summarize the following lecture chunk into well-structured Markdown notes, tailored to the user's preferences. If the chunk is cut off, please infer the intended meaning and complete the summary accordingly:${chunk}`;
    const qaPrompt = ChatPromptTemplate.fromMessages([
      ["system", prompt],
      ["human", "{question}"],
    ]);
    const llm = new ChatOpenAI({ model: "gpt-3.5-turbo", temperature: 0 }); // Make sure you have your OpenAI API key set up
    const simpleChain = RunnableSequence.from([
      async (input: {
        question: string,
        noteTakingStyle: string;
        learningStyle: string;
        levelOfStudy: string;
        course: string,
      }) => ({
        context: `This is some example context related to:
        Note-taking style: ${input.noteTakingStyle}
        Learning style: ${input.learningStyle}
        Level of study: ${input.levelOfStudy}
        Course: ${input.course}`,
        question: input.question,
      }),
      qaPrompt,
      llm,
    ]);
    const result = await simpleChain.invoke({
      question,
      noteTakingStyle: userInfo.noteTakingStyle,
      learningStyle: userInfo.learningStyle,
      levelOfStudy: userInfo.levelOfStudy,
      course: userInfo.course
    });

    return result.content as string;
  });

}

export const getNotesForModule = query({
  args: {
    moduleId: v.id("modules"),
  },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_moduleId", (q) => q.eq("moduleId", args.moduleId))
      .order("desc")
      .collect();

    return notes;
  },
});

export const getNote = internalQuery({
  args: { noteId: v.id("notes"), userId: v.string() },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);

    if (!note) {
      throw new Error("Note not found.");
    }

    const moduleUser = await ctx.db.get(note.moduleId);

    if (moduleUser == null) {
      throw new Error("Module not allowed to be null.");
    }

    if (args.userId != moduleUser.userId) {
      throw new Error("Not authorized to get this note.");
    }
    return await ctx.db.get(args.noteId);
  },
});

export const getNoteById = action({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args): Promise<Doc<"notes" & { content: string }>> => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authorized to use this action.");
    }

    const note = await ctx.runQuery(internal.notes.getNote, {
      noteId: args.noteId,
      userId: identity.subject,
    });
    if (!note) {
      throw new Error(`Note with ID ${args.noteId} not found.`);
    }

    const noteModule = await ctx.runQuery(internal.modules.getByIdInternal, {
      id: note.moduleId as Id<"modules">,
    });

    if (!noteModule) {
      throw new Error(`Module with ID ${note.moduleId} not found.`);
    }

    if (noteModule.userId !== identity.subject) {
      throw new Error("Not authorized to view this note.");
    }

    // Fetch content for each text chunk
    const textContent = await Promise.all(
      note.textChunks.map(async (chunkId) => {
        const url = await ctx.storage.getUrl(chunkId);
        if (!url) {
          throw new Error(`Failed to get URL for chunk ${chunkId}`);
        }
        const response = await fetch(url);
        return response.text();
      }),
    );

    // Combine all text chunks
    const fullContent = textContent.join("\n");

    return {
      ...note,
      content: fullContent,
    };
  },
});

export const searchNotesByContent = action({
  args: {
    moduleId: v.optional(v.id("modules")),
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const queryEmbedding = await generateEmbedding(args.query);

    const notes = await ctx.vectorSearch("notes", "by_noteEmbedding", {
      vector: queryEmbedding,
      limit: 10,
      filter: args.moduleId
        ? (q) => q.eq("moduleId", args.moduleId as Id<"modules">)
        : undefined,
    });

    return notes;
  },
});

export const deleteNote = mutation({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Authentication not present.");
    }

    const note = await ctx.db.get(args.noteId);

    if (!note) {
      throw new Error(`Note with ID ${args.noteId} not found.`);
    }

    const moduleUser = await ctx.db.get(note.moduleId);

    if (!moduleUser) {
      throw new Error("Module cannot be null.");
    }

    if (moduleUser.userId != identity.subject) {
      throw new Error("Not authorized to delete this note.");
    }

    // Delete the note's text chunks from storage
    for (const chunkId of note.textChunks) {
      await ctx.storage.delete(chunkId);
    }

    // Delete the note from the database
    await ctx.db.delete(args.noteId);

    return { success: true, message: "Note deleted successfully." };
  },
});




import axios from 'axios';
const Google_API_KEY="AIzaSyCg8w5Fl2crl1yv0kU5VQnpOhh1wECdyic";
const CX="804432fb1eb884936";
async function getImage(
  searchingQuery1: string,
): Promise<string> {
  return exponentialBackoff(async () => {
  const url = `https://www.googleapis.com/customsearch/v1?q=${searchingQuery1}&cx=${CX}&key=${Google_API_KEY}&searchType=image&num=1`;
  try {
    const response = await axios.get(url);
    const items = response.data.items;

    if (items && items.length > 0) {
      return items[0].link; // Return the first (best match) image URL
    } else {
      throw new Error('No images found');
    }
  } catch (error) {
    console.error('Error fetching image:', error);
    throw error;
  }
});
}
//to openURL needed
//hide env Variables as Google_API+CX



async function generateSearchQuery(
  note: string,
  userInfo: {
    noteTakingStyle: string;
    learningStyle: "auditory" | "visual" | "kinesthetic" | "analytical";
    levelOfStudy: "Bachelors" | "Associate" | "Masters" | "PhD";
    course: string;
  },
 
): Promise<string> {

  return exponentialBackoff(async () => {
    const prompt: string = `
    Your task is to:
    1.Highlight Core Themes: Identify and focus on the main concepts and themes present in the note. Ensure that the image encapsulates these key ideas visually.
    2.Use Simple and Clear Visuals: Create or select images that use clear, simple designs and symbols to represent complex ideas. Avoid clutter to enhance understanding and retention.
    3.Incorporate Relevant Context: Ensure that the image includes relevant contextual elements that help visual learners connect the visual representation with the information in the notes. Use annotations, labels, or color coding to provide additional clarity.
   4.Please ensure the search query does not exceed a maximum of 6 words to maintain clarity and focus.
    Given the note, provide the most relevant search query to find a highly accurate image that visually explains or represents the key concept. Focus on the essential elements and context of the note to create the search query.`;

    const question: string = `Based on the following lecture note: ${note}, generate the most relevant search query to find an accurate image that visually explains or represents the key concept of this content.
                                       Focus on the essential elements and context to ensure the search query retrieves the best possible image.`;

    const qaPrompt = ChatPromptTemplate.fromMessages([
      ["system", prompt],
      ["human", "{question}"],
    ]);
    const llm = new ChatOpenAI({ model: "gpt-3.5-turbo", temperature: 0 }); // Make sure you have your OpenAI API key set up
    const simpleChain = RunnableSequence.from([
      async (input: {
        question: string,
        learningStyle: string;
        levelOfStudy: string;
        course: string,
      }) => ({
        context: `This is some example context related to:,
        Learning style: ${input.learningStyle}
        Level of study: ${input.levelOfStudy},
        Course: ${input.course}`,
        question: input.question,
      }),
      qaPrompt,
      llm,
    ]);
    const result = await simpleChain.invoke({
      question,
      learningStyle: userInfo.learningStyle,
      levelOfStudy: userInfo.levelOfStudy,
      course: userInfo.course
    });
    return result.content as string;
  });
}



