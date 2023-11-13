import { app, errorHandler } from 'mu';

app.get('/', function(_req, res) {
  res.send('👋 pdf-flattener service here');
});

app.use(errorHandler);
