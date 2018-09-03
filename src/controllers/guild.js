const config = require("../config");
const { defaultErrorHandler } = require("./error");
const { toTitleCase } = require("../utils/utils");

const Character = require("../db/models/characterSchema");

const { guildRealm } = config;

exports.getAchievementLeaders = (req, res) => {
  const limit = req.query.limit ? Math.min(Math.abs(req.query.limit), 25) : 10;
  Character.find()
    .sort({ achievementPoints: -1 })
    .limit(limit)
    .exec()
    .then(result => {
      res.status(200).json(result);
    })
    .catch(err => {
      defaultErrorHandler(err, res);
    });
};

exports.getAchievementRank = (req, res) => {
  const name = toTitleCase(req.query.name);
  const realm = res.query.realm ? toTitleCase(res.query.realm) : guildRealm;
  Character.findOne({ name, realm }, "_id achievementPoints")
    .exec()
    .then(char => {
      if (!char) {
        const error = new Error("Character not found!");
        error.status = 404;
        throw error;
      }
      return Character.count({
        achievementPoints: { $gte: char.achievementPoints }
      }).exec();
    })
    .then(rank => {
      res.status(200).json(rank);
    })
    .catch(err => {
      defaultErrorHandler(err, res);
    });
};

exports.getIlvlLeaders = (req, res) => {
  const limit = req.query.limit ? Math.min(Math.abs(req.query.limit), 25) : 10;
  Character.find({ active: true })
    .sort({ ilvl: -1 })
    .limit(limit)
    .exec()
    .then(result => {
      res.status(200).json(result);
    })
    .catch(err => {
      defaultErrorHandler(err, res);
    });
};
