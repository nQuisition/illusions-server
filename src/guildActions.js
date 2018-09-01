const mongoose = require("mongoose");
const bnetUtils = require("./utils/bnetUtils");
const utils = require("./utils/utils");
const config = require("./config");
const logger = require("./utils/logger");
const dbUtils = require("./utils/dbUtils");
const Character = require("./db/models/characterSchema");
const CharacterChange = require("./db/models/characterChangeSchema");
const GuildChange = require("./db/models/guildChangeSchema");

exports.getBnetGuildMembers = apiGuild =>
  apiGuild.getMembers().then(res => {
    const members = res.members.map(obj => ({
      ...obj.character,
      rank: obj.rank
    }));
    return members;
  });

exports.getDBCharacterHeaders = () =>
  Character.find({}, "_id inGuild name realm lastModified rank").exec();

exports.partitionMembers = (apiCharacters, dbCharacters) => {
  const partitionedCharacters = {
    joined: [],
    leftIds: [],
    stayed: [],
    rejoined: []
  };
  apiCharacters.forEach(member => {
    const idx = dbCharacters.findIndex(
      char => char.name === member.name && char.realm === member.realm
    );
    if (idx >= 0) {
      if (dbCharacters[idx].inGuild) {
        partitionedCharacters.stayed.push(member);
      } else {
        partitionedCharacters.rejoined.push(member);
      }
    } else {
      partitionedCharacters.joined.push(member);
    }
  });
  partitionedCharacters.leftIds = dbCharacters
    .filter(
      char =>
        char.inGuild &&
        apiCharacters.findIndex(
          member => char.name === member.name && char.realm === member.realm
        ) < 0
    )
    .map(char => char._id);
  logger.info(
    `Total members: ${apiCharacters.length}, stayed: ${
      partitionedCharacters.stayed.length
    }, joined: ${partitionedCharacters.joined.length}, left: ${
      partitionedCharacters.leftIds.length
    }, rejoined: ${partitionedCharacters.rejoined.length}`
  );
  return partitionedCharacters;
};

const getBnetCharacterInfo = apiCharacters => {
  const promiseConstructors = apiCharacters.map(member => {
    const apiCharacter = bnetUtils.character(member.name, member.realm);
    return () =>
      apiCharacter.getItems().then(res => ({ ...res, rank: member.rank }));
  });
  return utils.partitionPromisesWithRetry(promiseConstructors, 10, 300);
};

exports.getBnetCharacterInfo = getBnetCharacterInfo;

exports.getDBModifiedCharacters = (apiCharacters, dbCharacters) => {
  logger.info("Looking for modified characters");
  const ids = dbCharacters
    .filter(ch => {
      const match = apiCharacters.find(
        ch1 => ch1.name === ch.name && ch1.realm === ch.realm
      );
      if (!match) {
        return false;
      }
      return match.lastModified !== ch.lastModified.getTime();
    })
    .map(ch => mongoose.Types.ObjectId(ch._id));
  logger.info(`There were ${ids.length} modified characters`);
  return Character.find({ _id: { $in: ids } }).exec();
};

exports.computeCharacterDiffs = (apiCharacters, dbCharacters) => {
  const allDiffs = [];
  dbCharacters.forEach(oldChar => {
    const newChar = dbUtils.constructBnetCharacter(
      apiCharacters.find(
        c => c.name === oldChar.name && c.realm === oldChar.realm
      )
    );
    const diffs = dbUtils.getCharacterDiff(oldChar, newChar);
    allDiffs.push(...diffs);
  });
  logger.info(`There were a total of ${allDiffs.length} changes`);
  return Promise.resolve(allDiffs);
};

exports.commitCharacterChanges = allDiffs => {
  return CharacterChange.insertMany(allDiffs, { ordered: false }).catch(err => {
    logger.error(`Error inserting changes! ${err.message}`);
    logger.error(`Failed: ${err.writeErrors && err.writeErrors.length}`);
    logger.error(`Inserted: ${err.result.nInserted}`);
    return Promise.resolve({});
  });
};

exports.updateDBCharacters = apiCharactersWithId => {
  const promises = apiCharactersWithId.map(char => {
    const { _id, ...character } = char;
    //FIXME we are constructing all these characters in the function above already
    const dbCharacter = dbUtils.constructBnetCharacter(character, false);
    //FIXME can only update fields that actually change?
    return Character.updateOne({ _id }, { $set: dbCharacter }).exec();
  });
  return Promise.all(promises);
};

exports.markCharactersLeft = (leftIds, leftAtTimestamp) => {
  logger.info(`Removing ${leftIds.length} characters`);
  const changes = leftIds.map(
    id =>
      new GuildChange({
        initiated: new Date(leftAtTimestamp),
        character: id,
        changeType: "leftGuild"
      })
  );
  return GuildChange.insertMany(changes, { ordered: false })
    .catch(err => {
      logger.error(`Error inserting guild changes! ${err.message}`);
      logger.error(`Failed: ${err.writeErrors && err.writeErrors.length}`);
      logger.error(`Inserted: ${err.result.nInserted}`);
      return Promise.resolve({});
    })
    .then(() => {
      const promises = leftIds.map(id =>
        Character.updateOne({ _id: id }, { $set: { inGuild: false } }).exec()
      );
      return Promise.all(promises);
    });
};

exports.markCharactersJoined = (joinedChars, joinedAtTimestamp) => {
  logger.info(`Adding ${joinedChars.length} characters`);
  logger.info(joinedChars.map(char => char.name).join(", "));
  return getBnetCharacterInfo(joinedChars)
    .then(res => {
      //TODO sometimes after namechange the api returns old names even though
      //the request contains the new one. This filters them out for now
      const toInsert = res
        .filter(
          char =>
            joinedChars.findIndex(
              char1 => char.name === char1.name && char.realm === char1.realm
            ) >= 0
        )
        .map(char => dbUtils.constructBnetCharacter(char));
      return Character.insertMany(toInsert);
    })
    .then(res => {
      const ids = res.map(char => char._id);
      const changes = ids.map(
        id =>
          new GuildChange({
            initiated: new Date(joinedAtTimestamp),
            character: id,
            changeType: "joinedGuild"
          })
      );
      return GuildChange.insertMany(changes, { ordered: false }).catch(err => {
        logger.error(`Error inserting guild changes! ${err.message}`);
        logger.error(`Failed: ${err.writeErrors && err.writeErrors.length}`);
        logger.error(`Inserted: ${err.result.nInserted}`);
        return Promise.resolve({});
      });
    });
};
