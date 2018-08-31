const Character = require("../db/models/characterSchema");
const CharacterChange = require("../db/models/characterChangeSchema");

const { deepCloneJSONObject } = require("./utils");

const activeCutoff = 1531915200000;

//JSON must include rank
const constructBnetCharacter = (json, wrap = true) => {
  const items = {};
  //TODO not safe if they add more non-item keys to "items"
  const slots = Object.keys(json.items).filter(
    key => typeof json.items[key] === "object"
  );
  slots.forEach(slot => {
    const jsonItem = json.items[slot];
    const {
      tooltipParams,
      appearance,
      artifactId,
      artifactAppearanceId,
      artifactTraits,
      azeriteItem,
      azeriteEmpoweredItem,
      weaponInfo,
      ...item
    } = jsonItem;
    if (jsonItem.tooltipParams && jsonItem.tooltipParams.set) {
      item.set = jsonItem.tooltipParams.set;
    }
    if (jsonItem.tooltipParams && jsonItem.tooltipParams.enchant) {
      item.enchant = jsonItem.tooltipParams.enchant;
    }
    if (jsonItem.tooltipParams && jsonItem.tooltipParams.azeritePowerLevel) {
      item.azeritePowerLevel = jsonItem.tooltipParams.azeritePowerLevel;
    }
    const gems = Object.keys(jsonItem.tooltipParams)
      .filter(k => k.startsWith("gem"))
      .map(k => jsonItem.tooltipParams[k]);
    if (gems && gems.length > 0) {
      item.gems = gems;
    }
    const azeritePowers = Object.keys(jsonItem.tooltipParams)
      .filter(k => k.startsWith("azeritePower"))
      .map(k => jsonItem.tooltipParams[k]);
    if (azeritePowers && azeritePowers.length > 0) {
      item.azeritePowers = azeritePowers;
    }
    if (jsonItem.azeriteItem) {
      item.azeriteLevel = jsonItem.azeriteItem.azeriteLevel;
      item.azeriteExperience = jsonItem.azeriteItem.azeriteExperience;
      item.azeriteExperienceRemaining =
        jsonItem.azeriteItem.azeriteExperienceRemaining;
    }
    if (jsonItem.weaponInfo) {
      item.wdps = jsonItem.weaponInfo.dps;
    }
    items[slot] = item;
  });
  const character = {
    lastModified: new Date(json.lastModified),
    active: json.lastModified >= activeCutoff,
    name: json.name,
    realm: json.realm,
    battlegroup: json.battlegroup,
    class: json.class,
    race: json.race,
    gender: json.gender,
    level: json.level,
    achievementPoints: json.achievementPoints,
    thumbnail: json.thumbnail,
    faction: json.faction,
    ilvl: json.items.averageItemLevel,
    ilvle: json.items.averageItemLevelEquipped,
    rank: json.rank ? json.rank : -1,
    items: items
  };
  return wrap ? new Character(character) : character;
};

const getShallowObjectDifferenceInKeys = (oldObj, newObj, keysAndDiffCalcs) => {
  const diffs = [];
  keysAndDiffCalcs.forEach(kadc => {
    const { key, diffCalc } = kadc;
    if (oldObj[key] !== newObj[key]) {
      const res = {
        key,
        old: oldObj[key],
        new: newObj[key]
      };
      const diff = diffCalc && diffCalc(oldObj[key], newObj[key]);
      if (diffCalc && diff !== undefined) {
        res.diff = diff;
      }
      diffs.push(res);
    }
  });
  return diffs;
};

const keysToCompare = ["id", "itemLevel", "enchant"];
const arrayKeysToCompare = ["gems", "relics", "bonusLists"];
const areItemsDifferent = (item1, item2) => {
  if ((!item1 && item2) || (item1 && !item2)) {
    return true;
  }
  if (!item1 && !item2) {
    return false;
  }
  let different = false;
  keysToCompare.forEach(key => {
    if (item1[key] !== item2[key]) {
      different = true;
    }
  });
  if (different) {
    return true;
  }
  arrayKeysToCompare.forEach(key => {
    if (JSON.stringify(item1[key]) !== JSON.stringify(item2[key])) {
      different = true;
    }
  });
  return different;
};

const simpleDiffCalc = (o1, o2) => o2 - o1;

const getCharacterDiff = (oldChar, newChar) => {
  const keysAndDiffCalcs = [
    { key: "race" },
    { key: "gender" },
    { key: "level", diffCalc: simpleDiffCalc },
    { key: "achievementPoints", diffCalc: simpleDiffCalc },
    { key: "thumbnail" },
    { key: "ilvl", diffCalc: simpleDiffCalc },
    { key: "ilvle", diffCalc: simpleDiffCalc },
    { key: "rank" }
  ];
  const diffs = getShallowObjectDifferenceInKeys(
    oldChar,
    newChar,
    keysAndDiffCalcs
  ).map(obj => {
    const { key, ...newObj } = obj;
    return { ...newObj, field: key };
  });
  const oldItems = {};
  const newItems = {};
  Object.keys(newChar.items).forEach(itemSlot => {
    if (areItemsDifferent(newChar.items[itemSlot], oldChar.items[itemSlot])) {
      oldItems[itemSlot] = oldChar.items[itemSlot];
      newItems[itemSlot] = newChar.items[itemSlot];
    }
  });
  if (Object.keys(oldItems).length > 0 || Object.keys(newItems).length > 0) {
    diffs.push({
      field: "items",
      old: oldItems,
      new: newItems
    });
  }
  return diffs.map(
    diff =>
      new CharacterChange({
        ...diff,
        initiated: oldChar.lastModified,
        expired: newChar.lastModified,
        character: oldChar._id
      })
  );
};

module.exports = {
  constructBnetCharacter,
  getCharacterDiff
};
