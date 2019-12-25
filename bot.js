var fs = require('fs');
const FootballData = require('footballdata-api-v2').default;
require('dotenv').config(); //To get Key for API
const footballData = new FootballData(process.env.myKey);

var Twit = require('twit');
var config = require('./config.js');
var T = new Twit(config);

var schedule = require('node-schedule');

//Checking for current and latest matchday
var currMatchDay = 1;
var currYear = 2019;

var tweetJob = schedule.scheduleJob(new Date() + 10, startBot);;

startBot(); //Once loaded startBot

async function startBot(){

  console.log("Bot is starting");

  var defaultData = await getData(); //Pre-load defaultData to get current matchday

  curryear = getYear(defaultData);
  console.log("Current year is " + currYear);

  currMatchDay = getMatchDay(defaultData); //Get current matchday from default data
  console.log("Current matchday is: " + currMatchDay);

  console.log("Requesting latest data");
  var newData = await getData();

  var finished = getMatchStatus(newData);
  if(finished){
    tweetIt(newData);
  }

  tweetOn = nextDate(newData);
  console.log("Next tweet will be on " + tweetOn);

  tweetJob = schedule.scheduleJob(tweetOn, startBot);

}



function tweetIt(data){
  //To post tweets
  var status = { status: getResult(data) };
  T.post('statuses/update', status, postTweet);
  function postTweet(err, data, response) {
    if(err){
      console.log("Did not tweet!"); //Doesn't tweet if duplicate either
      console.log(err);
    }
    else{
      console.log("Tweeted!");
    }
  }
}

// To find the current year we are in
function getYear(data){
  var currentYear = data['competition']['lastUpdated'];
  currentYear = new Date(currentYear);
  return currentYear.getFullYear();
}


//To find the results of the mighty Arsenal
function getMatchDay(data){
  var currMatchDay = data['matches'][0]['season']['currentMatchday'];
  return currMatchDay;
}

function getMatchStatus(data){
  var status;
  for(var i = 0; i < data['matches'].length; i++){
    var homeTeam = data['matches'][i]['homeTeam']['name'];
    var awayTeam = data['matches'][i]['awayTeam']['name'];
    var status = data['matches'][i]['status'];

    if(homeTeam == 'Arsenal FC' || awayTeam == 'Arsenal FC'){
      if(status == 'FINISHED'){
        return true;
      }
    }
  }
  return false;
}

function nextDate(data){
  var length = data['matches'].length;
  var arsDate;
  for(var i = 0; i < length; i++){
    var homeTeam = data['matches'][i]['homeTeam']['name'];
    var awayTeam = data['matches'][i]['awayTeam']['name'];

    if(homeTeam == 'Arsenal FC' || awayTeam == 'Arsenal FC'){
      arsDate = new Date(data['matches'][i]['utcDate']);
      break;
    }
  }
  var date1 = new Date(data['matches'][0]['utcDate']);
  var date2 = new Date(data['matches'][length - 1]['utcDate']);

  // Checks if Arsenal's match isn't rescheduled with resepect to current matchdate
  if(date1 < arsDate < date2){
    arsDate.setMinutes(arsDate.getMinutes() + 120);
    var today = new Date();
    if(today > arsDate){
      today.setDate(today.getDate() + 1);
      return today;
    }
    return arsDate;
  }
  // Will return the last match
  else if(Math.round((date2 - date1) / 86400000) > 5){
    return date1;
  }
  else{
    return date2;
  }
}


async function getData(){
  var params = {
      competitionId: 2021, //PL
      season: currYear,
      matchday: currMatchDay,
  };

  let fetchedData = await footballData.getMatchesFromCompetition(params);
  fs.writeFileSync('./matches.json', JSON.stringify(fetchedData, null, 4));
  let rawdata = fs.readFileSync('./matches.json');
  let data = JSON.parse(rawdata);
  return data;
}

function getResult(data){

  for(var i = 0; i < data['matches'].length; i++){
    var homeTeam = data['matches'][i]['homeTeam']['name'];
    var awayTeam = data['matches'][i]['awayTeam']['name'];

    var homeScore = data['matches'][i]['score']['fullTime']['homeTeam'];
    var awayScore = data['matches'][i]['score']['fullTime']['awayTeam'];

    scoreMessage = homeScore+' - '+awayScore;

    if(homeTeam == 'Arsenal FC'){
      if(homeScore > awayScore){
        message = 'Happy to see Arsenal win '+scoreMessage+' against '+awayTeam;
        return message;
      }
      else if(homeScore < awayScore){
        message = 'Disappointed to see Arsenal lose '+scoreMessage+' against '+awayTeam;
        return message;
      }
      else {
        message = 'Well atleast we got a point after drawing '+scoreMessage+' against '+awayTeam;
        return message;
      }
    }
    else if(awayTeam == 'Arsenal FC'){
      if(homeScore > awayScore){
        message = 'Disappointed to see Arsenal lose '+scoreMessage+' against '+homeTeam;
        return message;
      }
      else if(homeScore < awayScore){
        message = 'Happy to see Arsenal win '+scoreMessage+' against '+homeTeam;
        return message;
      }
      else {
        message = 'Well atleast we got a point after drawing '+scoreMessage+' against '+homeTeam;
        return message;
      }
    }
  }
}

// // To get tweets
// function latestTweet(){
//   var params = { count: 1, screen_name: "@hydelenergy" };
//   T.get('statuses/user_timeline', params, getData);
//   function getData(err, data, response){
//     return data[0]['text'];
//   }
// }
