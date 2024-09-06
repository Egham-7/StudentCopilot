import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Store a new module
export const store = mutation({
  args: {
    name: v.string(),
    department: v.string(),
    credits: v.number(),
    image: v.string(),
    semester: v.union(v.literal("Fall"), v.literal("Spring"), v.literal("Summer")),
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
    image: v.optional(v.string()),
    semester: v.optional(v.union(v.literal("Fall"), v.literal("Spring"), v.literal("Summer"))),
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

    return id;
  },
});

// Delete a module
export const deleteModule = mutation({
  args: { id: v.id("modules") },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Called deleteModule without authentication present");
    }

    const existingModule = await ctx.db.get(args.id);

    if (!existingModule) {
      throw new Error("Module not found");
    }

    if (existingModule.userId !== identity.subject) {
      throw new Error("Not authorized to delete this module");
    }

    await ctx.db.delete(args.id);

    return args.id;
  },
});


export const getById = query({
  args: { id: v.id("modules") },

  handler: async (ctx, args) => {


    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {

      throw new Error("Tried to fetch module info without authentication present.")

    }

    const moduleUser = await ctx.db.get(args.id);


    if (!moduleUser) {

      throw new Error("Module not found.");
    }


    if (moduleUser.userId !== identity.subject) {

      throw new Error("Not authorized to view this module.");
    }

    return moduleUser;


  }
})




export const queryByUserId = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called queryModulesByUserId without authentication present");
    }

    const userId = identity.subject;

    const modules = await ctx.db
      .query("modules")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    const modulesWithImages = await Promise.all(
      modules.map(async (module) => {
        if (module.image) {
          try {
            const imageUrl = await ctx.storage.getUrl(module.image as Id<"_storage">);
            return { ...module, image: imageUrl || undefined };
          } catch (error) {
            console.error(`Failed to get URL for module ${module._id}:`, error);
            return { ...module, image: undefined };
          }
        } else {
          return { ...module, image: undefined };
        }
      })
    );

    return modulesWithImages;
  },
});
