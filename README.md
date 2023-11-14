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

### Deltas

