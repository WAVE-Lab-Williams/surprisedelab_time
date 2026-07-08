
/* ----------------------------------------
 Functions for datahandling and saving (*fxdata, *fxsave)
-------------------------------------------*/

function getURLParameter(sParam){
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++){
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam){
            return sParameterName[1];
        }
    }
    console.log("The input was not found")
    return 'no_query'
};

function shuffle(array) {
  let currentIndex = array.length,  randomIndex;
  // While there remain elements to shuffle.
  while (currentIndex > 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
}
function randomIndex(arrayLength){
    var randIndex = Math.floor(Math.random() * arrayLength);
    return randIndex
}

function randomChoice(array, numChoices) {
    var shuffledArray = shuffle(array);
    var selectedItems = [];
    for (var s = 0; s < numChoices; s++) {
        selectedItems.push(shuffledArray[s]);
    }
    return selectedItems
}

function randomChoiceIndex(arrayLength, numChoices) {
    var indexList = [];
    for (var i = 0; i < arrayLength; i++){
        indexList.push(i)
    }
    var shuffledIndexList = shuffle(indexList);
    var selectedIndexes = [];
    for (var si = 0; si < numChoices; si++){
        selectedIndexes.push(shuffledIndexList[si]);
    }
    return selectedIndexes
}

function randomIntFromRange(min, max) { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min)
}

function cutArray(array, cutAfterIndex) {
    var cutArray1 = array.slice(0,cutAfterIndex)
    var cutArray2 = array.slice(cutAfterIndex)
    return [cutArray1, cutArray2]
}

function count_words(str) {
    // Handle empty or null/undefined input
    if (!str || typeof str !== 'string') {
        return 0;
    }

    // Trim whitespace and split by one or more whitespace characters
    // Filter out empty strings that might result from multiple spaces
    return str.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function calculate_delay_time(num_words, multiplier = 50) {
    // Handle invalid input for num_words
    if (typeof num_words !== 'number' || num_words < 0) {
        return 0;
    }

    // Handle invalid input for multiplier
    if (typeof multiplier !== 'number' || multiplier < 0) {
        multiplier = 50; // fallback to default
    }

    return num_words * multiplier;
}


/* ----------------------------------------
 Reading experiment "config" settings safely (*fxconfig)
-------------------------------------------
 Settings come from the WAVE backend as JSON. Two things to know:
   1. In JSON / JavaScript, EVERY number is a float — there is no "integer" type.
      A setting you saved as 5 may arrive as 5.0, so round it yourself if you
      need a whole number (e.g. a trial count).
   2. A value keeps the type you stored: text stays text, lists stay lists.
      If you stored "5" as text it will NOT become a number on its own.

 So don't read config.something directly — say what type you expect, and give a
 fallback to use if the value is missing or unusable:

   var reps  = asInteger(config.number_of_repetitions, 1);   //  5.0   -> 5
   var ratio = asNumber (config.sample_ratio, 0.5);          //  0.3   -> 0.3
   var name  = asText   (config.condition, "control");       //  "a"   -> "a"
   var flag  = asBoolean(config.use_feedback, true);         //  true  -> true
   var items = asList   (config.colors, ["blue", "orange"]); //  [...] -> [...]
   var parts = asObject (config.weights, {a: 0.5, b: 0.5});  //  {...} -> {...}
-------------------------------------------*/

// A whole number — rounds floats (5.0 -> 5). Uses fallback if not a number.
function asInteger(value, fallback) {
    var number = Number(value);
    return Number.isFinite(number) ? Math.round(number) : fallback;
}

// Any number, decimals included (0.3). Uses fallback if not a number.
function asNumber(value, fallback) {
    var number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

// Text. Uses fallback only when the value is missing (null/undefined).
function asText(value, fallback) {
    return (value === null || value === undefined) ? fallback : String(value);
}

// true / false. Uses fallback if the value isn't a boolean.
function asBoolean(value, fallback) {
    return (value === true || value === false) ? value : fallback;
}

// A list/array ([200, 500]). Uses fallback if it isn't a list.
function asList(value, fallback) {
    return Array.isArray(value) ? value : fallback;
}

// A plain object/dict ({weight: 0.3}). Uses fallback if it isn't one.
// (typeof null is "object" and arrays are objects too, hence the extra checks.)
function asObject(value, fallback) {
    var isPlainObject = value !== null && typeof value === "object" && !Array.isArray(value);
    return isPlainObject ? value : fallback;
}