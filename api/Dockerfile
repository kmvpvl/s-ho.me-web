FROM node:22-alpine
RUN mkdir -p /usr/src/shome_server
WORKDIR /usr/src/shome_server
COPY . .
RUN npm i
RUN npm run build
RUN chown -R node /usr/src/shome_server
USER node
EXPOSE ${PORT}
CMD ["npm", "run", "start"]