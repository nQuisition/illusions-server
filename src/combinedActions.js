const bnetUtils = require("./utils/bnetUtils");
const guildActions = require("./guildActions");

const fullyProcessGuild = (guildName, guildRealm) => {
  const apiGuild = bnetUtils.guild(guildName, guildRealm);
  let dbCharacters;
  let partitionedCharacters;
  let fetchedCharacters;
  let guildLastModified;
  console.time("guildFull");
  console.log("Initiating");
  return apiGuild
    .getLastmod()
    .then(lastMod => {
      guildLastModified = lastMod;
      return Promise.all([
        guildActions.getBnetGuildMembers(apiGuild),
        guildActions.getDBCharacterHeaders()
      ]);
    })
    .then(res => {
      const apiCharacters = res[0];
      dbCharacters = res[1];
      return guildActions.partitionMembers(apiCharacters, dbCharacters);
    })
    .then(res => {
      partitionedCharacters = res;
      return guildActions.getBnetCharacterInfo(partitionedCharacters.stayed);
    })
    .then(res => {
      fetchedCharacters = res;
      return guildActions.getDBModifiedCharacters(
        fetchedCharacters,
        dbCharacters
      );
    })
    .then(res => {
      const apiCharactersWithId = res.map(char => ({
        _id: char._id,
        ...fetchedCharacters.find(
          char1 => char1.name === char.name && char1.realm === char.realm
        )
      }));
      return guildActions
        .computeCharacterDiffs(fetchedCharacters, res)
        .then(diffs => guildActions.commitCharacterChanges(diffs))
        .then(() => guildActions.updateDBCharacters(apiCharactersWithId));
    })
    .then(() => {
      return guildActions.markCharactersJoined(
        partitionedCharacters.joined,
        guildLastModified
      );
    })
    .then(() => console.log("Donezo!"))
    .catch(err => console.log("ERRRROR!!!!", err))
    .then(() => {
      console.timeEnd("guildFull");
      //mongoose.disconnect();
    });
};

module.exports = {
  fullyProcessGuild
};
