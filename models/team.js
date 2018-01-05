const mongoose = require('mongoose');


const TeamSchema = new mongoose.Schema({
  driftToken: {
    refreshToken: String,
    accessToken: String,
    tokenType: String,
    expiresIn: Number,
    orgId: Number,
  },
  orgId: {type: Number, required: true, unique: true, index: true},

}, {timestamps: true, collection: 'teams'});

module.exports = {
  model: mongoose.model('Team', TeamSchema)
};