import { PDFDocument } from "pdf-lib";

/**
 * @param {string | Uint8Array | ArrayBuffer} pdfBytes
 * @returns {Promise<Uint8Array>}
 */
export default async function flattenPDF(pdfBytes) {
  const pdfDoc = await PDFDocument.load(pdfBytes);

  const form = pdfDoc.getForm();

  for (const field of form.getFields()) {
    const widgets = field.acroField.getWidgets();

    for (let idx = widgets.length - 1; idx >= 0; idx--) {
      const widget = widgets[idx];
      /* As of May 2025, documents coming from SigningHub contain two signature
         fields, one named SignatureX, the other SH_SIGNATURE_XXXXXX. The original
         flattening method simply flattened the whole PDF, but given these new
         SigningHub pdfs, this would result in an error when calling the flatten()
         method. To fix this error we remove the SignatureX's widget before calling
         the flatten() method.
         Why use the AP() method to find the widget we want to remove? There's no
         good reason, it's one field that is visibly different. */
      if (!widget.AP()) {
        field.acroField.removeWidget(idx);
      }
    }
  }
  form.flatten();

  return pdfDoc.save();
}
