declare module 'pdf-img-convert' {
    interface ConvertOptions {
      width?: number;
      height?: number;
      page_numbers?: number[];
      base64?: boolean;
    }
  
    export function convert(
      pdfBuffer: ArrayBuffer,
      options?: ConvertOptions
    ): Promise<string[]>;
  }
  