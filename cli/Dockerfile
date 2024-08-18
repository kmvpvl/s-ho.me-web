FROM node:22-alpine
RUN mkdir -p /usr/src/shome_cli
WORKDIR /usr/src/shome_cli
COPY . .
RUN npm i
RUN npm install -g serve
RUN npm run build
RUN chown -R node /usr/src/shome_cli
USER node
EXPOSE ${PORT}
CMD ["serve", "-s", "build"]