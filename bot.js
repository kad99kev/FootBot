var fs = require('fs');
const FootballData = require('footballdata-api-v2').default;
require('dotenv').config(); //To get Key for API
const footballData = new FootballData(process.env.myKey);

var Twit = require('twit');
var config = require('./config.js');
var T = new Twit(config);

var schedule = require('node-schedule');

//Checking for current and latest matchday
var currMatchDay = 19;
var oldMatchDay = 19;
var currYear = 2019;

var tweetJob = schedule.scheduleJob(new Date() + 10, startBot);;

startBot(); //Once loaded startBot

async function startBot(){

  console.log("Bot is starting");

  //Pre-load defaultData to get current matchday
  var defaultData = await getData(currYear, currMatchDay);

  curryear = getYear(defaultData);
  console.log("Current year is " + currYear);

  //Get current matchday from default data
  currMatchDay = getMatchDay(defaultData);
  console.log("Current matchday is: " + currMatchDay);

  // Using parameters obtained from default data
  // We fetch latest data
  console.log("Requesting latest data");
  var newData = await getData(currYear, currMatchDay);

  // Check if match is finished of the new matchday
  var finished = getMatchStatus(newData);
  if(finished && oldMatchDay != currMatchDay){
    tweetIt(newData);
    oldMatchDay = currMatchDay;
  }

  // Schedule the tweet for the next match
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
      console.log(err.allErrors[0]['message']);
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

    // If the match is already over but API hasn't updated
    if(today > arsDate){
      today.setDate(today.getDate() + 1);
      return today;
    }
    return arsDate;
  }

  // If the last game on the matchday is the rescheuled match
  // We will use the game that will kickoff on time i.e the 1st match of the matchday
  // If the 1st match is over, use today's date and check tomorrow
  else if(Math.round((date2 - date1) / 86400000) > 5){
    var today = new Date();
    if(today > date1){
      today.setDate(today.getDate() + 1);
      return today;
    }
    return date1;
  }
  // If there has been no rescheduling for the enitre matchday
  // then we can use the last match of the matchday to check for results
  // otherwise we'll use today's date and check again tommorow
  else{
    var today = new Date();
    if(today > date2){
      today.setDate(today.getDate() + 1);
      return today;
    }
    return date2;
  }
}


async function getData(year, matchDay){
  console.log(matchDay);
  var params = {
      competitionId: 2021, //PL
      season: year,
      matchday: matchDay,
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
