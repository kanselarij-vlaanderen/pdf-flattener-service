import {
  sparqlEscapeUri,
  sparqlEscapeString,
  sparqlEscapeDateTime,
  sparqlEscapeInt,
  query,
  update,
} from 'mu';
import { APPLICATION_GRAPH } from '../cfg';

/**
 * @param {string} id
 * @param {string} [graph]
 * @returns {Promise<null>}
 */
async function getMuFile(id, graph=APPLICATION_GRAPH, queryFunction=query) {
  const queryString = `
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
PREFIX dbpedia: <http://dbpedia.org/ontology/>
PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
PREFIX mu: <http://mu.semte.ch/vocabularies/core/>

SELECT DISTINCT
  (?file AS ?uri) ?name ?format ?size ?extension ?created ?physicalUri
WHERE {
  GRAPH ${sparqlEscapeUri(graph)} {
    ?file mu:uuid ${sparqlEscapeString(id)} ;
      a nfo:FileDataObject ;
      nfo:fileName ?name ;
      dct:format ?format ;
      nfo:fileSize ?size ;
      dbpedia:fileExtension ?extension ;
      dct:created ?created .
    ?physicalUri nie:dataSource ?file .
  }
} LIMIT 1`;

  const response = await queryFunction(queryString);

  if (response?.results?.bindings?.length) {
    const binding = response.results.bindings[0];
    return {
      id,
      uri: binding.uri.value,
      name: binding.name.value,
      format: binding.format.value,
      size: binding.size.value,
      extension: binding.extension.value,
      created: binding.created.value,
      physicalUri: binding.physicalUri.value,
    };
  }
  return null;
}

async function createMuFile(virtualFile, physicalFile, graph=APPLICATION_GRAPH, updateFunction=update) {
  const queryString = `
PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
PREFIX dbpedia: <http://dbpedia.org/ontology/>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>

INSERT DATA {
  GRAPH ${sparqlEscapeUri(graph)} {
    ${sparqlEscapeUri(virtualFile.uri)} a nfo:FileDataObject ;
      nfo:fileName ${sparqlEscapeString(virtualFile.name)} ;
      mu:uuid ${sparqlEscapeString(virtualFile.id)} ;
      dct:format ${sparqlEscapeString(virtualFile.format)} ;
      nfo:fileSize ${sparqlEscapeInt(virtualFile.size)} ;
      dbpedia:fileExtension ${sparqlEscapeString(virtualFile.extension)} ;
      dct:created ${sparqlEscapeDateTime(virtualFile.created)} ;
      dct:modified ${sparqlEscapeDateTime(virtualFile.created)} .
    ${sparqlEscapeUri(physicalFile.uri)} a nfo:FileDataObject ;
      nie:dataSource ${sparqlEscapeUri(virtualFile.uri)} ;
      nfo:fileName ${sparqlEscapeString(physicalFile.name)} ;
      mu:uuid ${sparqlEscapeString(physicalFile.id)} ;
      dct:format ${sparqlEscapeString(physicalFile.format)} ;
      nfo:fileSize ${sparqlEscapeInt(physicalFile.size)} ;
      dbpedia:fileExtension ${sparqlEscapeString(physicalFile.extension)} ;
      dct:created ${sparqlEscapeDateTime(physicalFile.created)} ;
      dct:modified ${sparqlEscapeDateTime(physicalFile.created)} .
  }
}`;
  await updateFunction(queryString);
};

export {
  getMuFile,
  createMuFile,
}
