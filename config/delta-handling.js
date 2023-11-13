import fs from 'fs';
import path from 'path';
import { uuid } from 'mu';
import { updateSudo, querySudo } from '@lblod/mu-auth-sudo';

import { FILE_RESOURCE_BASE, FILE_STORAGE_PATH, LOG_INCOMING_DELTAS } from '../cfg';
import flattenPDF from '../lib/flatten-pdf';
import { createMuFile } from '../lib/file';
import { getFileFromPiece, linkFlattenedPDFToPiece } from "./piece";

const KANSELARIJ_GRAPH = 'http://mu.semte.ch/graphs/organizations/kanselarij';
const SIGNING_GRAPH = 'http://mu.semte.ch/graphs/system/signing';

/**
 * @param {Object} deltas
 * @returns {Object[]}
 */
function getInterestedQuads(deltas) {
  const inserts = deltas
        .map((delta) => delta.inserts)
        .reduce((allInserts, inserts) => allInserts.concat(inserts));

  const interestedQuads = inserts
        .filter(({ predicate }) => predicate.value === 'http://mu.semte.ch/vocabularies/ext/handtekenen/ongetekendStuk');
  return interestedQuads;
}

export default async function handler(deltas) {
  if (LOG_INCOMING_DELTAS) {
    console.log('Received deltas:', JSON.stringify(deltas, null, 2));
  }
  const interestedQuads = getInterestedQuads(deltas);
  if (interestedQuads.length === 0) {
    console.log('Deltas contained no interesting quads, not doing anything');
    return;
  }

  console.log(`Found ${interestedQuads.length} quads in deltas that we will handle`);

  for (const quad of interestedQuads) {
    const signedPieceUri = quad.subject.value;
    const unsignedPieceUri = quad.object.value;

    const signedFile = await getFileFromPiece(signedPieceUri, KANSELARIJ_GRAPH, querySudo);
    const unsignedFile = await getFileFromPiece(unsignedPieceUri, KANSELARIJ_GRAPH, querySudo);

    if (unsignedFile === null || signedFile?.extension !== 'pdf') {
      console.log(`Skipped interesting quad because I couldn't find the unsigned file or because the signed file was not a PDF: ${JSON.stringify(quad, null, 2)}`)
      continue;
    }
    console.log(`Handling signed piece: ${signedPieceUri}`);

    const signedFilePath = signedFile.physicalUri.replace('share://', '/share/');

    const pdfBytes = fs.readFileSync(signedFilePath);
    const flattenedPdfBytes = await flattenPDF(pdfBytes);
    console.log(`Generated flattened PDF for signed file ${signedFile.uri}`);

    const physicalFileUuid = uuid();
    const virtualFileUuid = uuid();

    const flattenedFilePath = path.join(FILE_STORAGE_PATH, `${physicalFileUuid}.pdf`);
    fs.writeFileSync(flattenedFilePath, flattenedPdfBytes);
    console.log(`Writing flattened PDF to ${flattenedFilePath}`);

    const now = new Date();
    const virtualFile = {
      id: virtualFileUuid,
      uri: path.join(FILE_RESOURCE_BASE, virtualFileUuid),
      name: `${unsignedFile.pieceName} (kopie).pdf`,
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

    console.log(`Creating virtual mu-file ${virtualFile.uri}`);
    await createMuFile(virtualFile, physicalFile, SIGNING_GRAPH, updateSudo);

    console.log(`Linking virtual mu-file ${virtualFile.uri} to unsigned piece ${unsignedPieceUri}`);
    await linkFlattenedPDFToPiece(unsignedPieceUri, virtualFile.uri, SIGNING_GRAPH, updateSudo);
  }
  console.log('Finished handling incoming deltas');
}
