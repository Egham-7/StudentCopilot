import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import * as pdfjsLib from 'pdfjs-dist';

export const extractPdfImages = action({
  args: {
    lectureId: v.id("lectures"),
  },
  handler: async (ctx, args) => {
    const lecture = await ctx.runQuery(internal.lectures.getLecture, {
      lectureId: args.lectureId,
    });

    //check if its pdf
    if (lecture.fileType !== "pdf") {   
      return { images: [], message: "File is not a PDF" };
    }

    //get pdfURL
    const pdfUrl = await ctx.storage.getUrl(lecture.contentUrl);
    if (!pdfUrl) {
      return { images: [], message: "Could not get PDF URL" };
    }

    const response = await fetch(pdfUrl);
    const pdfData = await response.arrayBuffer();
    
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const imageIds = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const context = canvas.getContext('2d');
      
      if (!context) {
        continue;
      }

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      const blob = await new Promise<Blob>(resolve => {
        canvas.toBlob(blob => {
          resolve(blob as Blob);
        }, 'image/png');
      });
      
      const imageId = await ctx.storage.store(blob);
      imageIds.push(imageId);
    }
    
    //to store images IDs
    await ctx.runMutation(internal.pdfImages.storePdfImages, {
      lectureId: args.lectureId,
      imageIds: imageIds,
    });

    return {
      images: imageIds,
      message: `Successfully extracted ${imageIds.length} images`
    };
  },
});
