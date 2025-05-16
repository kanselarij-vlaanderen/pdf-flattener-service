import { PDFDocument, PDFName, PDFRef } from "pdf-lib";

/**
 * @param {string | Uint8Array | ArrayBuffer} pdfBytes
 * @returns {Promise<Uint8Array>}
 */
export default async function flattenPDF(pdfBytes) {
  const pdfDoc = await PDFDocument.load(pdfBytes);

  const form = pdfDoc.getForm();

  for (const field of form.getFields()) { 
    // Ensure AP has an N entry.
    // see: https://github.com/Hopding/pdf-lib/issues/789#issuecomment-774551592
    const widget0 = field.acroField.getWidgets()[0];
    const AP = widget0.ensureAP();
    AP.set(PDFName.of('N'), PDFRef.of(0, 0));

    // ???
    console.debug("######################## testing");
    console.debug(field.isExported());
    field.enableExporting();
    
    // // See: https://github.com/Hopding/pdf-lib/issues/1168#issuecomment-1321581900
    // while (field.acroField.getWidgets().length) {
    //     field.acroField.removeWidget(0);
    // }
  }

  form.flatten();

  return pdfDoc.save();
}
