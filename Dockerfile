FROM ubuntu:latest
MAINTAINER Neeme Kahusk "neeme.kahusk@ut.ee"
RUN apt-get update -y
RUN apt-get install -y curl gnupg
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
RUN apt-get update -y && apt-get -y install yarn
COPY . /app
WORKDIR /app
RUN yarn
RUN yarn build
ENTRYPOINT ["yarn"]
CMD ["start:dist"]


