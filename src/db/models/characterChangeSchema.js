const mongoose = require("mongoose");

const characterChangeSchema = mongoose.Schema({
  initiated: { type: Date, index: true },
  expired: { type: Date, index: true },
  character: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Character",
    index: true
  },
  field: String,
  //subField: String,
  old: mongoose.Schema.Types.Mixed,
  new: mongoose.Schema.Types.Mixed,
  diff: mongoose.Schema.Types.Mixed
});

characterChangeSchema.index(
  { initiated: 1, expired: 1, character: 1, field: 1 /*, subfield: 1*/ },
  { unique: true }
);

const model = mongoose.model("CharacterChange", characterChangeSchema);

model.on("index", function(err) {
  if (err) {
    console.error("characterChangeSchema index error: %s", err);
  } else {
    console.info("characterChangeSchema indexing complete");
  }
});

module.exports = model;
