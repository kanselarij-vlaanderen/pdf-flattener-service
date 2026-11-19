import fs from 'fs';
import path from 'path';
import { uuid } from 'mu';

import { FILE_RESOURCE_BASE, FILE_STORAGE_PATH } from '../cfg';
import flattenPDF from './flatten-pdf';
import { createMuFile } from './file';

/**
 * Flatten the PDF of an existing mu-file and store the result as a new mu-file.
 * The source file is left untouched.
 *
 * @param {object} sourceFile A (virtual) mu-file as returned by getMuFile
 * @param {string} name Name of the new file
 * @param {string} graph Graph to write the new file's metadata to
 * @param {function} updateFunction Function used to execute the SPARQL update
 * @returns {Promise<object>} The newly created virtual mu-file
 */
export default async function flattenMuFile(sourceFile, name, graph, updateFunction) {
  const sourceFilePath = sourceFile.physicalUri.replace('share://', '/share/');

  const pdfBytes = fs.readFileSync(sourceFilePath);
  const flattenedPdfBytes = await flattenPDF(pdfBytes);
  console.log(`Generated flattened PDF for file ${sourceFile.uri}`);

  const physicalFileUuid = uuid();
  const virtualFileUuid = uuid();

  const flattenedFilePath = path.join(FILE_STORAGE_PATH, `${physicalFileUuid}.pdf`);
  console.log(`Writing flattened PDF to ${flattenedFilePath}`);
  fs.writeFileSync(flattenedFilePath, flattenedPdfBytes);

  const now = new Date();
  const virtualFile = {
    id: virtualFileUuid,
    uri: FILE_RESOURCE_BASE + virtualFileUuid,
    name,
    extension: 'pdf',
    size: flattenedPdfBytes.byteLength,
    created: now,
    format: 'application/pdf',
  };

  const physicalFile = {
    id: physicalFileUuid,
    uri: flattenedFilePath.replace('/share/', 'share://'),
    name: `${physicalFileUuid}.pdf`,
    extension: 'pdf',
    size: flattenedPdfBytes.byteLength,
    created: now,
    format: 'application/pdf',
  };

  try {
    console.log(`Creating virtual mu-file ${virtualFile.uri}`);
    await createMuFile(virtualFile, physicalFile, graph, updateFunction);
  } catch (error) {
    // Don't leave an orphaned file on disk if its metadata couldn't be stored
    fs.rmSync(flattenedFilePath, { force: true });
    throw error;
  }

  return virtualFile;
}
