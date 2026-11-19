import { updateSudo, querySudo } from '@lblod/mu-auth-sudo';

import { KANSELARIJ_GRAPH } from '../cfg';
import flattenMuFile from '../lib/flatten-file';
import { getFileFromPiece, linkFlattenedPDFToPiece } from "./piece";

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
    return;
  }

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

    const virtualFile = await flattenMuFile(
      signedFile,
      `${unsignedFile.pieceName} (ondertekend).pdf`,
      KANSELARIJ_GRAPH,
      updateSudo
    );

    console.log(`Linking virtual mu-file ${virtualFile.uri} to unsigned piece ${unsignedPieceUri}`);
    await linkFlattenedPDFToPiece(unsignedPieceUri, virtualFile.uri, KANSELARIJ_GRAPH, updateSudo);
  }
}
