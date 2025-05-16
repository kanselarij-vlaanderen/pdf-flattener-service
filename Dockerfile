FROM semtech/mu-javascript-template:1.7.0

RUN apt-get update && apt-get install -y graphicsmagick && apt-get autoremove -y
