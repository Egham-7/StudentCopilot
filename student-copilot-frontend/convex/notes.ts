import { internalAction, internalMutation, internalQuery, mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import OpenAI from "openai";
import { callChatCompletionsAPI, generateEmbedding } from "./ai";
import { exponentialBackoff } from "./utils"


export const storeClient = mutation({
  args: {
    lectureIds: v.array(v.id("lectures")),
    moduleId: v.id("modules")
  },
  handler: async (ctx, args) => {
    // Schedule the fetch and process action

    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authorized to use this endpoint.");
    }

    const user = await ctx.db.query("users").withIndex("by_clerkId").first();

    if (user == null) {
      throw new Error("User not found.");
    }

    const moduleUser = await ctx.db.get(args.moduleId);

    if (moduleUser == null) {
      throw new Error("Module not found.");
    }


    if (moduleUser.userId != identity.subject) {
      throw new Error("Not allowed to create notes for this module.");
    }


    await ctx.scheduler.runAfter(0, internal.notes.fetchAndProcessTranscriptions, {
      lectureIds: args.lectureIds,
      noteTakingStyle: user.noteTakingStyle,
      learningStyle: user.learningStyle,
      course: user.course,
      levelOfStudy: user.levelOfStudy
    });

    return { success: true, message: "Lecture transcription processing scheduled." };
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
      v.literal("analytical")
    ),
    course: v.string(),
    levelOfStudy: v.union(
      v.literal("Bachelors"),
      v.literal("Associate"),
      v.literal("Masters"),
      v.literal("PhD")
    )


  },
  handler: async (ctx, args) => {
    const transcriptionChunks: string[] = [];

    for (const lectureId of args.lectureIds) {
      const lecture = await ctx.runQuery(internal.notes.getLecture, { lectureId });
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
      levelOfStudy: args.levelOfStudy
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
      v.literal("analytical")
    ),
    course: v.string(),
    levelOfStudy: v.union(
      v.literal("Bachelors"),
      v.literal("Associate"),
      v.literal("Masters"),
      v.literal("PhD")
    )
  },
  handler: async (ctx, args) => {
    const { transcriptionChunks, noteTakingStyle, learningStyle, course, levelOfStudy } = args;


    // Process chunks in parallel


    const chunkPromises = transcriptionChunks.map(async (chunk) => {
      return exponentialBackoff(async () => {
        const noteChunk = await processChunk(chunk, { noteTakingStyle, learningStyle, course, levelOfStudy });
        const noteChunkBlob = new Blob([noteChunk], { type: 'text/plain' });
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
      const sum = allEmbeddings.reduce((acc, embedding) => acc + (embedding[i] || 0), 0);
      concatenatedEmbedding.push(sum / allEmbeddings.length);
    }

    // Store the list of note chunk IDs and the concatenated embedding in the database
    await ctx.runMutation(internal.notes.storeNotes, {
      noteChunkIds: noteChunkIds,
      lectureIds: args.lectureIds,
      embedding: concatenatedEmbedding
    });
  }
});




export const storeNotes = internalMutation({
  args: {
    noteChunkIds: v.array(v.id("_storage")),
    lectureIds: v.array(v.id("lectures")),
    embedding: v.array(v.float64())
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
      noteEmbedding: args.embedding
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



  }
});

async function processChunk(chunk: string, userInfo: {
  noteTakingStyle: string;
  learningStyle: "auditory" | "visual" | "kinesthetic" | "analytical";
  levelOfStudy: "Bachelors" | "Associate" | "Masters" | "PhD";
  course: string;
}): Promise<string> {

  return exponentialBackoff(async () => {

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are an expert note-taker and summarizer with a keen ability to distill complex information into clear, concise, and well-structured notes. Tailor your notes to the following user preferences:

Note-taking style: ${userInfo.noteTakingStyle}
Learning style: ${userInfo.learningStyle}
Level of study: ${userInfo.levelOfStudy}
Course: ${userInfo.course}

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

Produce notes that would be valuable for review and quick reference, tailored to the user's specific needs and the course content. If the lecture chunk appears to be cut off mid-sentence or mid-thought, please use your best judgment to infer the intended meaning and complete the idea logically. Do not leave any sentences or thoughts unfinished in your summary.`
      },
      {
        role: "user",
        content: `Please summarize the following lecture chunk into well-structured Markdown notes, tailored to the user's preferences. If the chunk is cut off, please infer the intended meaning and complete the summary accordingly:

${chunk}`
      }
    ];

    const response = await callChatCompletionsAPI(messages);

    return response;



  })
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

    const note = await ctx.runQuery(internal.notes.getNote, { noteId: args.noteId, userId: identity.subject });
    if (!note) {
      throw new Error(`Note with ID ${args.noteId} not found.`);
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
      })
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
    query: v.string()
  },
  handler: async (ctx, args) => {
    const queryEmbedding = await generateEmbedding(args.query);

    const notes = await ctx.vectorSearch("notes", "by_noteEmbedding", {
      vector: queryEmbedding,
      limit: 10,
      filter: args.moduleId
        ? (q) => q.eq("moduleId", args.moduleId as Id<"modules">)
        : undefined
    });

    return notes;
  }
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
