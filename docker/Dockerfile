FROM node:fermium-alpine3.14

RUN apk add --no-cache curl jq

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 13778
CMD [ "/bin/sh", "-c" ]
