import { pdfjs } from "react-pdf";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";
pdfjs.GlobalWorkerOptions.workerPort = new pdfWorker();

export { pdfjs };
