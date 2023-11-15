import { app, errorHandler } from 'mu';
import bodyParser from 'body-parser';
import { LOG_INCOMING_DELTAS } from './cfg';
import DeltaCache from './lib/delta-cache';
import DeltaHandler from './lib/delta-handler';

app.get('/', function(_req, res) {
  res.send('👋 pdf-flattener service here');
});

app.post('/flatten', function(_req, _res) {});

app.post('/flatten/:fileId', function(req, _res) {
  const fileId = req.params.fileId;
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
