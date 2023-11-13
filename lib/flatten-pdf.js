import { PDFDocument } from "pdf-lib";

/**
 * @param {string | Uint8Array | ArrayBuffer} pdfBytes
 * @returns {Promise<Uint8Array>}
 */
export default async function flattenPDF(pdfBytes) {
  const pdfDoc = await PDFDocument.load(pdfBytes);

  const form = pdfDoc.getForm();

  form.flatten();

  return pdfDoc.save();
}
