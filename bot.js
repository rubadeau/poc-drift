require('dotenv').config();
const express = require('express');
const bot = express();
const bodyParser = require('body-parser');
const request = require('request');
const async = require('async');
const zendesk = require('node-zendesk');
let winston = require('winston');
const Sentry = require('winston-raven-sentry');

winston = new winston.Logger({
  transports: [
    new winston.transports.Console({level: 'error'}),
    new Sentry({
      level: 'error',
      dsn: process.env.SENTRY,
      patchGlobal: true,
    })
  ],
});

//TODO OAuth - Team collection

//TODO Conversations collection

//TODO People collection

//TODO optimistic update

//TODO new ZD oauth client

bot.use(bodyParser.json());
bot.listen(process.env.PORT || 3000, () => console.log('POC Bot for Drift is listening on port 3000!'));

bot.post('/', (message, res) => {
  if (message.body.type === 'new_message' && message.body.data.body.startsWith('/zendesk')) {
    let options = {
      url: 'https://driftapi.com/v1/conversations/' + message.body.data.conversationId.toString() + '/messages',
      headers: {
        'User-Agent': 'request',
        'Authorization': 'Bearer jKrQHBqTvZhsFomI8jWBuA2Hggny9oOi',
      }
    };
    request(options, function(err, response, body) {
      if (err) {
        console.log(err);
//notify user of fail
      } else {
        if (response && response.statusCode > 201) {
          console.log(response.statusCode);
          console.log(body)
//handle and notify
        } else {
          let user;
          let userCache =[];
          let convo = JSON.parse(body);
          let transcript;
          let zd;
          let zdUser;
          let zendeskToken = '507b04b689f24100a333d59fd2b82dd54b3440940e04a65b3b7cd8c4c2f93d3d';
          let zendeskSubdomain = 'd3v-bubbleiq';

          //TODO handle pagination

          async.series([
            function(step) {
              async.eachOfSeries(convo.data.messages, function(message, position, cb) {
                if(userCache.indexOf(message.author.id) === -1){

                  options.url = 'https://driftapi.com/contacts/' + message.author.id;
                  request(options, function(err, response, body) {
                    if (err) {
                      console.log(err);
                      //TODO notify user of fail
                    } else {
                      if (response && response.statusCode < 201) {
                        user = JSON.parse(body);
                      }
                      userCache[message.author.id] = user;
                      cb()
                    }
                  })
                } else {
                  cb()
                }
              }, function() {
                step();
              });
            },
            function(step) {
              //TODO spin through messages and build transcript

              let contactDisplayName;
              if (user && user.data && user.data.attributes && user.data.attributes.display_name) {
                contactDisplayName = user.data.attributes.display_name + ": "
              } else if (user && user.data && user.data.attributes && user.data.attributes.email) {
                contactDisplayName = user.data.attributes.email + ": "
              } else {
                contactDisplayName = "Unknown Visitor Name: "
              }
              async.eachOfSeries(convo.data.messages, function(message, position, cb) {
                if (message.type === 'chat') {
                  let chat;
                  if (message.author.type === 'user') {
                    chat = 'Drift Agent ' + message.author.id + ': ' + message.body + '\n'
                  } else {
                    chat = contactDisplayName + message.body + '\n'
                  }
                  if(!transcript){
                    transcript = chat
                  } else {
                    transcript += chat;
                  }
                }
                cb();
              }, function() {
                step();
              });
            },
            function(step) {
              //TODO find or create ticket

              if (user && user.data && user.data.attributes && user.data.attributes.email){
                zd = zendesk.createClient({
                  username: 'tristan@bubbleiq.com',
                  token: zendeskToken,
                  remoteUri: 'https://' + zendeskSubdomain + '.zendesk.com/api/v2',
                  oauth: true
                });
                zd.users.search({query: user.data.attributes.email}, function(err, req, users) {
                  if (err) {
                    console.log(err);
                    return;
                  }
                  if (users.length === 1) {
                    zdUser = users[0];
                    step();

                  } else if (users.length > 1) {
                    zdUser = users[0];
                    step();

                  } else {
                    zd.users.create({
                      "user": {
                        "name": user.data.attributes.display_name,
                        "email": user.data.attributes.email,
                        "verified": true
                      }
                    }, function(err, req, body) {
                      if (err) {
                        console.log(err);
                        return;
                      }
                      zdUser = body;
                      step();
                    });
                  }
                });
              } else {
                zdUser = null;
                step()
              }
            },
            function(step) {
              //TODO create ticket by requests api

              if(zdUser && zdUser.role === 'end-user'){
                let zdEndUser = zendesk.createClient({
                  username: 'tristan@bubbleiq.com',
                  token: zendeskToken,
                  remoteUri: 'https://' + zendeskSubdomain + '.zendesk.com/api/v2',
                  oauth: true,
                  asUser: zdUser.email
                });
                let request = {
                  "request": {
                    "subject": 'Drift Chat Transcript',
                    "comment": {"body": transcript, "public": true},
                    "requester_id": zdUser.id,
                  }
                };
                zdEndUser.requests.create(request, function(err, req, zdTicket) {
                  if (err) {
                    console.log(err);
                    return;
                  }
                  console.log(zdTicket)
                  step();

                });
              } else {
                //TODO test this path
                let ticket = {
                  "ticket": {
                    "subject": 'Drift Chat Transcript',
                    "comment": {"body": transcript, "public": true},
                  }
                };
                zd.tickets.create(ticket, function(err, req, zdTicket) {
                  if (err) {
                    console.log(err);
                    return;
                  }
                  console.log(zdTicket);
                  step();

                });
              }
            }
          ], function(err) {
            if (err) {
              console.log(err)
            } else {
              //TODO scope and post back message to user with zenlink
              console.log("yup")
            }
          });
        }
      }
    });
  }
  return res.send('ok')
});