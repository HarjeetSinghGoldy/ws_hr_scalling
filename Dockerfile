FROM node:13
WORKDIR /home/node/app
# COPY app /home/node/app
RUN npm install
# CMD npm run app
CMD ["sh","-c","npm start"]


