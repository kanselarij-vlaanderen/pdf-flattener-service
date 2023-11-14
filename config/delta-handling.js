import fs from 'fs';
import path from 'path';
import { uuid } from 'mu';
import { updateSudo, querySudo } from '@lblod/mu-auth-sudo';

import { FILE_RESOURCE_BASE, FILE_STORAGE_PATH } from '../cfg';
import flattenPDF from '../lib/flatten-pdf';
import { createMuFile } from '../lib/file';
import { getFileFromPiece, linkFlattenedPDFToPiece } from "./piece";

const KANSELARIJ_GRAPH = 'http://mu.semte.ch/graphs/organizations/kanselarij';

function getInterestedQuads(deltas) {
  const inserts = deltas
        .map((delta) => delta.inserts)
        .reduce((allInserts, inserts) => allInserts.concat(inserts));

  const filteredOnPredicate = inserts
        .filter(({ predicate }) => predicate.value === 'http://mu.semte.ch/vocabularies/ext/handtekenen/ongetekendStuk');

  const interestedQuads = filteredOnPredicate
        .filter((quad, index) =>
          // Array#findIndex returns the first element that matches
          // So we're iterating over the array and getting the quad and its
          // index, and every time we look for the index of the first occurrence
          // of that quad. The outer filter then checks if the iteration's index
          // matches the index returned by findIndex, in which case it's the
          // first occurence and we store it. Any latter occurrences of the quad
          // get discarded
          filteredOnPredicate.findIndex(
            (_quad) => quad.subject.value === _quad.subject.value
          ) === index)

  return interestedQuads;
}

export default async function handle(deltas) {
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
      console.log(`Skipped interesting quad because I couldn't find the unsigned file or because the signed file was not a PDF: ${JSON.stringify(quad)}`)
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
    await createMuFile(virtualFile, physicalFile, KANSELARIJ_GRAPH, updateSudo);

    console.log(`Linking virtual mu-file ${virtualFile.uri} to unsigned piece ${unsignedPieceUri}`);
    await linkFlattenedPDFToPiece(unsignedPieceUri, virtualFile.uri, KANSELARIJ_GRAPH, updateSudo);
  }
  console.log('Finished handling incoming deltas');
}
