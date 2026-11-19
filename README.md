# PDF Flattener

This service flattens PDFs and stores a copy of the flattened PDF. This is useful for PDFs that contain images or forms, as all the contents are combined into a single layer.

This services builds upon the file-model as defined in the [file-service](https://github.com/mu-semtech/file-service). Any file metadata passed into or written by this service should conform to what the file-service expeccts.

## Tutorials

**Developing this service**

Add the following snippet to your `docker-compose.override.yml`:

``` yaml
  pdf-flattener:
    environment:
      NODE_ENV: "development"
      LOG_INCOMING_DELTAS: "true"
    volumes:
      - ../pdf-flattener-service:/app
      - ../pdf-flattener-service/config:/config
      - ./data/files:/share
```

## Reference

### API

#### POST /flatten/:fileId

Flatten the PDF of the (virtual) file with the given `mu:uuid` and store the result as a new file.

This endpoint is meant for system administrators to catch missed deltas.

##### Response

###### 201 Created

The flattened PDF was stored. The response body contains the newly created file:

```json
{
  "data": {
    "type": "files",
    "id": "f21529a1-e3f2-11f1-9b16-91a1743b5539",
    "attributes": {
      "uri": "http://themis.vlaanderen.be/id/bestand/f21529a1-e3f2-11f1-9b16-91a1743b5539",
      "name": "document.pdf",
      "format": "application/pdf",
      "size": 3312,
      "extension": "pdf",
      "created": "2026-11-19T08:26:40.827Z"
    }
  }
}
```

###### 400 Bad Request

The file isn't a PDF.

###### 404 Not Found

No file with the given id exists in the kanselarij graph.

###### 500 Internal Server Error

Flattening or storing the file failed, e.g. because the file is missing on disk or the PDF can't be parsed.

### Deltas

#### POST /delta

Endpoint for the [delta-notifier](https://github.com/mu-semtech/delta-notifier). The service responds with `202 Accepted` right away and handles the received deltas one by one in the background.

The service reacts to inserted triples of the form `<signed piece> sign:ongetekendStuk <unsigned piece>`. Deleted triples are ignored. For every such triple it will:

1. Flatten the PDF of the signed piece and store the result as a new file named `<title of the unsigned piece> (ondertekend).pdf`.
2. Create a new piece for that file, titled `<title of the unsigned piece> (ondertekend)`, and link it to the unsigned piece with `sign:getekendStukKopie`. The new piece gets the access level of the unsigned piece, except that a public access level becomes "intern overheid".

A triple is skipped when the file of the signed piece isn't a PDF, when the unsigned piece has no file, or when one of the pieces already has a `sign:getekendStukKopie`.

Add the following rule to the delta-notifier configuration:

``` javascript
{
  match: {
    graph: {
      value: 'http://mu.semte.ch/graphs/organizations/kanselarij',
    },
    predicate: {
      type: 'uri',
      value: 'http://mu.semte.ch/vocabularies/ext/handtekenen/ongetekendStuk',
    }
  },
  callback: {
    url: 'http://pdf-flattener/delta',
    method: 'POST'
  },
  options: {
    resourceFormat: 'v0.0.1',
    gracePeriod: 500,
    ignoreFromSelf: true
  }
}
```

