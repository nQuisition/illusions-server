const mongoose = require("mongoose");

const classSchema = mongoose.Schema({
  _id: Number,
  mask: Number,
  name: String,
  color: String,
  specs: [
    {
      name: String,
      role: String,
      backgroundImage: String,
      icon: String,
      description: String,
      order: Number,
      talents: [{ type: Number, ref: "Talent" }]
    }
  ]
});

module.exports = mongoose.model("Class", classSchema);
