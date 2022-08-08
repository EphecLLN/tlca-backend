FROM node:16
WORKDIR /tlca-backend
COPY . /tlca-backend
RUN yarn install
CMD ["yarn", "start"]
