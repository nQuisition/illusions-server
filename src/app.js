const mongoose = require("mongoose");
const config = require("./config");
const combinedActions = require("./combinedActions");
const bnetUtils = require("./utils/bnetUtils");

const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");

const Character = require("./db/models/characterSchema");

const app = express();

const port = process.env.PORT;
if (!port) {
  console.log("No port environmental variable specified! Exiting.. ");
  process.exit(-1);
}

app.use(morgan("combined"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://127.0.0.1");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

//TODO had to put retryWrites to false to make index creation work...
//Will not need index creating by mongoose in production though
mongoose.connect(
  `mongodb+srv://${config.dbUser}:${config.dbPassword}@${
    config.dbAddress
  }?retryWrites=false`
);
//mongoose.set("debug", true);

const guildName = "illusions";
const guildRealm = "draenor";

//TODO move to utils
const toTitleCase = str =>
  str.charAt(0).toUpperCase() + str.substr(1).toLowerCase();

app.get("/guild", (req, res) => {
  Character.find()
    .sort({ achievementPoints: -1 })
    .limit(5)
    .exec()
    .then(result => {
      res.status(200).json(result);
    })
    .catch(err => {
      console.log("ERROR!", err.message);
      res.status(500).send(err.message);
    });
});

app.get("/guild/ach", (req, res) => {
  const name = toTitleCase(req.query.name);
  const realm = res.query.realm ? toTitleCase(res.query.realm) : guildRealm;
  Character.findOne({ name, realm }, "_id achievementPoints")
    .exec()
    .then(char => {
      console.log(name, realm, char);
      return Character.count({
        achievementPoints: { $gte: char.achievementPoints }
      }).exec();
    })
    .then(rank => {
      res.status(200).json(rank);
    })
    .catch(err => {
      console.log("ERROR!", err.message);
      res.status(500).send(err.message);
    });
});

app.get("/guild/ilvl", (req, res) => {
  const limit = req.query.limit ? Math.min(Math.abs(req.query.limit), 25) : 10;
  Character.find({ active: true })
    .sort({ ilvl: -1 })
    .limit(limit)
    .exec()
    .then(result => {
      res.status(200).json(result);
    })
    .catch(err => {
      console.log("ERROR!", err.message);
      res.status(500).send(err.message);
    });
});

app.get("/character", (req, res) => {
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
        return res.status(404).send("Specified character is not in the guild");
      }
      res.status(200).json({
        characters: char,
        notFound: req.query.id
          ? ids.filter(d => char.findIndex(c => c._id == d) < 0)
          : []
      });
    })
    .catch(err => {
      console.log("ERROR!", err.message);
      res.status(500).send(err.message);
    });
});

app.get("/progression", (req, res) => {
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
      res.status(err.response.status || 500).send(err.message);
    });
});

app.listen(port);
console.log(`Server started on port ${port}`);

const interval = 5; //in minutes
const scheduleFullyProcessGuild = () => {
  combinedActions.fullyProcessGuild(guildName, guildRealm);
  setTimeout(scheduleFullyProcessGuild, interval * 60 * 1000);
};

scheduleFullyProcessGuild();
