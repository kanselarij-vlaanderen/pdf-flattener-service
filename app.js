import { app, errorHandler } from 'mu';
import bodyParser from 'body-parser';
import handler from './config/delta-handling';

app.get('/', function(_req, res) {
  res.send('👋 pdf-flattener service here');
});

app.post('/flatten', function(_req, _res) {});

app.post('/flatten/:fileId', function(req, _res) {
  const fileId = req.params.fileId;
});

app.post('/delta', bodyParser.json({ limit: '500mb' }), function(req, res) {
  handler(req.body);

  res.status(202).end();
});

app.use(errorHandler);
