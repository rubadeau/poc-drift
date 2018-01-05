require('dotenv').config();
const express = require('express');
const bot = express();
const bodyParser = require('body-parser');
const Drift = require('drift-chat');
const Team = require('./models/team').model;

bot.use(bodyParser.json());
bot.listen(process.env.PORT || 3000, () => console.log('POC Bot for Drift is listening on port 3000!'));
let mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
mongoose.connect(process.env.MONGO_URI);

bot.get('/oauth', (req, res) => {
  const drift = new Drift();
  const options = {
    clientId: process.env.CLIENTID,
    clientSecret: process.env.DRIFTKEY,
    code: req.query.code,
  };

  drift.oauth(options, async function(err,driftToken){
    if(err){
      console.log(err);
    } else {
      const teamObj = {
        orgId: driftToken.orgId,
        driftToken: driftToken
      };
      const team = await Team.update({orgId: driftToken.orgId},teamObj,{upsert:true, setDefaultsOnInsert: true});
      console.log(team)
    }
  });
  return res.status(200).end();
});

bot.post('/', async (message, res) => {
  if (message.body.token === process.env.DRIFTVERIFY &&
    message.body.type === 'new_message' &&
    message.body.data.body.startsWith('/foobar')) {
    let team = await Team.findOne({orgId: message.body.orgId});
    const drift = new Drift(team.driftToken.accessToken);

    drift.getConvo(message.body.data.author.id)
      .then((body) =>
        console.log(body))
      .catch(async (err) => {
        const options = {
          clientId: process.env.CLIENTID,
          clientSecret: process.env.DRIFTKEY,
          refreshToken: team.driftToken.refreshToken
        };

        team.driftToken = await drift.refreshToken(options);
        team.save();
        drift.token = team.driftToken.accessToken;

        drift.getConvo(message.body.data.author.id)
          .then((body) =>
            console.log(body))
          .catch((err) => console.log(err));
        });
  }
  return res.status(200).end();
});