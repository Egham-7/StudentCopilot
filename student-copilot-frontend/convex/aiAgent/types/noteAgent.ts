import { z } from 'zod';

export const ImageBlockSchema = z.object({
    file: z.object({
      url: z.string()
        .url()
        .describe("URL of the image relevant to the notes.")
    }),
    caption: z.string().optional(),
    withBorder: z.boolean().optional(),
    withBackground: z.boolean().optional(),
    stretched: z.boolean().optional(),
  });
  
  // Define schema for paragraph block data
  export const ParagraphBlockSchema = z.object({
    text: z.string().describe("Content of the paragraph"),
    alignment: z.enum(['left', 'center', 'right'])
      .optional()
      .describe("Text alignment in the paragraph (optional)"),
  });
  
  // Define schema for header block data
  export const HeaderBlockSchema = z.object({
    text: z.string().describe("Title or header text"),
    level: z.string().describe("Heading level, e.g., '1' for H1, '2' for H2, etc."),
  });
  
  //Define schema for bulletpointlist data.
  export const ListBlockSchema = z.object({
    style:z.string(),
    items:z.array(z.string()),
  })

  // Define schema for note blocks, which can be of header, paragraph, or image type
  export const NoteBlockSchema = z.object({
    type: z.enum(['header', 'paragraph', 'image','list']),
    data: z.union([HeaderBlockSchema, ParagraphBlockSchema, ImageBlockSchema, ListBlockSchema]),
  });



  // Define TypeScript types from Zod schemas
  export type TNoteBlock = z.infer<typeof NoteBlockSchema>;
  
  