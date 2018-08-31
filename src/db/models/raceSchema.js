const mongoose = require("mongoose");

const raceSchema = mongoose.Schema({
  _id: Number,
  mask: Number,
  side: String,
  name: String,
  image: String
});

module.exports = mongoose.model("Race", raceSchema);
