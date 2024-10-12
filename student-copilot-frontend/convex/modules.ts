import { Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Store a new module
export const store = mutation({
  args: {
    name: v.string(),
    department: v.string(),
    credits: v.number(),
    image: v.optional(v.id("_storage")),
    semester: v.union(
      v.literal("Fall"),
      v.literal("Spring"),
      v.literal("Summer"),
    ),
    year: v.string(),
    description: v.optional(v.string()),
    prerequisites: v.optional(v.array(v.string())),
    instructors: v.array(v.string()),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Called storeModule without authentication present");
    }

    const userId = identity.subject;

    const moduleId = await ctx.db.insert("modules", {
      ...args,
      userId,
    });

    await ctx.scheduler.runAfter(0, internal.notifications.store, {
      userId,
      message: `New module "${args.name}" has been created`,
      type: "new_module",
      relatedId: moduleId,
    });

    return moduleId;
  },
});

// Update an existing module
export const update = mutation({
  args: {
    id: v.id("modules"),
    name: v.optional(v.string()),
    department: v.optional(v.string()),
    credits: v.optional(v.number()),
    image: v.optional(v.id("_storage")),
    semester: v.optional(
      v.union(v.literal("Fall"), v.literal("Spring"), v.literal("Summer")),
    ),
    year: v.optional(v.string()),
    description: v.optional(v.string()),
    prerequisites: v.optional(v.array(v.string())),
    instructors: v.optional(v.array(v.string())),
  },

  handler: async (ctx, args) => {
    const { id, ...updateFields } = args;

    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Called updateModule without authentication present");
    }

    const existingModule = await ctx.db.get(id);

    if (!existingModule) {
      throw new Error("Module not found");
    }

    if (existingModule.userId !== identity.subject) {
      throw new Error("Not authorized to update this module");
    }

    await ctx.db.patch(id, updateFields);

    await ctx.scheduler.runAfter(0, internal.notifications.store, {
      userId: existingModule.userId,
      message: `Module "${existingModule.name}" has been updated`,
      type: "module_updated",
      relatedId: id,
    });

    return id;
  },
});

export const deleteModule = mutation({
  args: { moduleId: v.id("modules") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error(
        "Called scheduleModuleDeletion without authentication present",
      );
    }

    const existingModule = await ctx.db.get(args.moduleId);
    if (!existingModule) {
      throw new Error("Module not found");
    }

    if (existingModule.userId !== identity.subject) {
      throw new Error("Not authorized to delete this module");
    }

    // Schedule the deletion
    await ctx.scheduler.runAfter(
      0,
      internal.modules.deleteModuleAndRelatedData,
      { moduleId: args.moduleId },
    );

    await ctx.scheduler.runAfter(0, internal.notifications.store, {
      userId: existingModule.userId,
      message: `Module "${existingModule.name}" has been deleted`,
      type: "module_deleted",
      relatedId: args.moduleId,
    });

    return args.moduleId;
  },
});

export const deleteModuleAndRelatedData = internalMutation({
  args: { moduleId: v.id("modules") },
  handler: async (ctx, args) => {
    // Query all lectures associated with this module
    const lectures = await ctx.db
      .query("lectures")
      .withIndex("by_moduleId", (q) => q.eq("moduleId", args.moduleId))
      .collect();

    // Delete lectures and their associated videos
    for (const lecture of lectures) {
      // Delete the video from storage
      if (lecture.contentUrl) {
        await ctx.storage.delete(lecture.contentUrl);
      }

      // Delete lecture transcriptions from storage
      for (const transcriptionId of lecture.lectureTranscription) {
        await ctx.storage.delete(transcriptionId);
      }

      // Delete the lecture from the database
      await ctx.db.delete(lecture._id);
    }

    // Delete the module
    await ctx.db.delete(args.moduleId);
  },
});

export const getById = query({
  args: { id: v.id("modules") },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error(
        "Tried to fetch module info without authentication present.",
      );
    }

    const moduleUser = await ctx.db.get(args.id);

    if (!moduleUser) {
      throw new Error("Module not found.");
    }

    if (moduleUser.userId !== identity.subject) {
      throw new Error("Not authorized to view this module.");
    }

    return moduleUser;
  },
});

export const getByIdInternal = internalQuery({
  args: { id: v.id("modules") },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error(
        "Tried to fetch module info without authentication present.",
      );
    }

    const moduleUser = await ctx.db.get(args.id);

    if (!moduleUser) {
      throw new Error("Module not found.");
    }

    if (moduleUser.userId !== identity.subject) {
      throw new Error("Not authorized to view this module.");
    }

    return moduleUser;
  },
});

export const queryByUserId = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error(
        "Called queryModulesByUserId without authentication present",
      );
    }

    const userId = identity.subject;

    const modules = await ctx.db
      .query("modules")
      .withIndex("by_userId", (q) => q.eq("userId", userId as Id<"users">))
      .order("desc")
      .collect();

    const modulesWithImages = await Promise.all(
      modules.map(async (module) => {
        if (module.image) {
          try {
            const imageUrl = await ctx.storage.getUrl(
              module.image as Id<"_storage">,
            );
            return { ...module, image: imageUrl || undefined };
          } catch (error) {
            console.error(`Failed to get URL for module ${module._id}:`, error);
            return { ...module, image: undefined };
          }
        } else {
          return { ...module, image: undefined };
        }
      }),
    );

    return modulesWithImages;
  },
});
