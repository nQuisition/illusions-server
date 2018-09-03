const config = require("../config");
const { defaultErrorHandler } = require("./error");
const { toTitleCase } = require("../utils/utils");
const bnetUtils = require("../utils/bnetUtils");

const Character = require("../db/models/characterSchema");

const { guildRealm } = config;

exports.getCharacterFull = (req, res) => {
  let promise;
  let ids;
  if (req.query.id) {
    ids = Array.isArray(req.query.id) ? req.query.id : [req.query.id];
    promise = Character.find({ _id: { $in: ids } });
  } else {
    const name = toTitleCase(req.query.name);
    const realm = req.query.realm ? toTitleCase(req.query.realm) : guildRealm;
    promise = Character.find({ name, realm });
  }
  promise
    .exec()
    .then(char => {
      if (!char || (!req.query.id && char.length <= 0)) {
        const error = new Error("Specified character is not in the guild");
        error.status = 404;
        throw error;
      }
      res.status(200).json({
        characters: char,
        notFound: req.query.id
          ? ids.filter(d => char.findIndex(c => c._id == d) < 0)
          : []
      });
    })
    .catch(err => {
      defaultErrorHandler(err, res);
    });
};

exports.getCharacterProgression = (req, res) => {
  const raidsOfInterest = [8638];
  const name = toTitleCase(req.query.name);
  const realm = req.query.realm ? toTitleCase(req.query.realm) : guildRealm;
  bnetUtils
    .character(name, realm)
    .getContexts("progression,items,talents")
    .then(char => {
      const resProgression = char.progression.raids
        .filter(zone => raidsOfInterest.includes(zone.id))
        .map(zone => {
          const resZone = {
            name: zone.name
          };
          resZone.bosses = zone.bosses.map(boss => {
            const { id, lfrKills, lfrTimestamp, ...resBoss } = boss;
            return resBoss;
          });
          const diffs = ["normal", "heroic", "mythic"];
          const starterObj = {};
          diffs.forEach(diff => {
            starterObj[diff] = { bosses: 0, kills: 0, total: 0 };
          });
          const progressionNumbers = resZone.bosses.reduce((obj, boss) => {
            diffs.forEach(diff => {
              const diffKills = boss[diff + "Kills"];
              obj[diff].kills += diffKills;
              if (diffKills > 0) {
                obj[diff].bosses += 1;
              }
              obj[diff].total += 1;
            });
            return obj;
          }, starterObj);
          return { ...resZone, ...progressionNumbers };
        });
      const { progression, items, talents, ...resChar } = char;
      resChar.progression = resProgression;
      const selectedSpec = talents.find(t => t.selected);
      resChar.spec = selectedSpec ? selectedSpec.spec.name : "No Spec";
      resChar.ilvl = items.averageItemLevel;
      resChar.ilvle = items.averageItemLevelEquipped;
      res.status(200).json(resChar);
    })
    .catch(err => {
      defaultErrorHandler(err, res);
    });
};
