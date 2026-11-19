import { app, errorHandler } from 'mu';
import bodyParser from 'body-parser';
import { querySudo, updateSudo } from '@lblod/mu-auth-sudo';
import { FILE_JSONAPI_TYPE, KANSELARIJ_GRAPH, LOG_INCOMING_DELTAS } from './cfg';
import DeltaCache from './lib/delta-cache';
import DeltaHandler from './lib/delta-handler';
import { getMuFile } from './lib/file';
import flattenMuFile from './lib/flatten-file';

app.get('/', function(_req, res) {
  res.send('👋 pdf-flattener service here');
});

app.post('/flatten', function(_req, _res) {});

app.post('/flatten/:fileId', async function(req, res, next) {
  const fileId = req.params.fileId;

  try {
    const file = await getMuFile(fileId, KANSELARIJ_GRAPH, querySudo);
    if (file === null) {
      return next({ message: `File with id ${fileId} not found`, status: 404 });
    }
    if (file.extension?.toLowerCase() !== 'pdf') {
      return next({ message: `File with id ${fileId} is not a PDF`, status: 400 });
    }

    const flattenedFile = await flattenMuFile(file, file.name, KANSELARIJ_GRAPH, updateSudo);

    return res.status(201).send({
      data: {
        type: FILE_JSONAPI_TYPE,
        id: flattenedFile.id,
        attributes: {
          uri: flattenedFile.uri,
          name: flattenedFile.name,
          format: flattenedFile.format,
          size: flattenedFile.size,
          extension: flattenedFile.extension,
          created: flattenedFile.created,
        },
      },
    });
  } catch (error) {
    console.error(`Something went wrong while flattening file with id ${fileId}`);
    console.error(error);
    return next({ message: `Failed to flatten file with id ${fileId}: ${error?.message}`, status: 500 });
  }
});

const cache = new DeltaCache();
const deltaHandler = new DeltaHandler();

app.post('/delta', bodyParser.json({ limit: '500mb' }), function(req, res) {
  const deltas = req.body;
  if (LOG_INCOMING_DELTAS)
    console.log(`Receiving deltas ${JSON.stringify(deltas)}`);

  cache.push(...deltas);
  deltaHandler.processDeltas(cache);

  res.status(202).end();
});

app.use(errorHandler);
