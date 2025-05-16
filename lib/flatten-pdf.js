import { PDFDocument } from "pdf-lib";

/**
 * @param {string | Uint8Array | ArrayBuffer} pdfBytes
 * @returns {Promise<Uint8Array>}
 */
export default async function flattenPDF(pdfBytes) {
  const pdfDoc = await PDFDocument.load(pdfBytes);

  const form = pdfDoc.getForm();

  for (const field of form.getFields()) {
    // See: https://github.com/Hopding/pdf-lib/issues/1168#issuecomment-1321581900
    if (field.isExported()) {
      while (field.acroField.getWidgets().length) {
          field.acroField.removeWidget(0);
      }
    }
  }
  form.flatten();

  return pdfDoc.save();
}
