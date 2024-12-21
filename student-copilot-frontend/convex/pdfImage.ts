import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import pdf2img from "pdf-img-convert";

export const extractPdfImages = action({
  args: {
    lectureId: v.id("lectures"),
  },
  handler: async (ctx, args) => {
    // Get lecture details
    const lecture = await ctx.runQuery(internal.lectures.getLecture, {
      lectureId: args.lectureId, //lectureId
    });

    // Verify it's a PDF
    if (lecture.fileType !== "pdf") {   
      return { images: [], message: "File is not a PDF" };
    }

    // Get PDF URL
    const pdfUrl = await ctx.storage.getUrl(lecture.contentUrl);

    if (!pdfUrl) {
        return { images: [], message: "Could not get PDF URL" };
    }
    
    // Now pdfUrl is guaranteed to be a string
    const response = await fetch(pdfUrl);

    const pdfBuffer = await response.arrayBuffer();
    
    // Convert PDF pages to images
    const outputImages = await pdf2img.convert(pdfBuffer, {
      width: 1024,
      height: 1024,
      base64: true
    });
    
    // Store images in Convex storage
    const imageIds = await Promise.all(
    outputImages.map(async (imageBase64) => {
        const imageBlob = new Blob([imageBase64], { type: 'image/png' });
        return await ctx.storage.store(imageBlob);
    })
    );


    return {
      images: imageIds,
      message: `Successfully extracted ${imageIds.length} images`

    };
  },
});
