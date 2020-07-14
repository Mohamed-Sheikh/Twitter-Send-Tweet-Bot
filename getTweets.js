const OAuth = require("oauth");
const motivation = require("./tweets.json");
const softwareMotivation = require("./softwareTweets.json");
const AWS = require("aws-sdk");
const fs = require("fs");
const { timeStamp } = require("console");
const moment = require("moment")


handler = async (event) => {
  console.log("event is ", event);
  var item;
  var index;
  var type;
  var quoteNo;
  var dynamodb;
  var total = 0;
  var previous = '';
  let obj = new Set();
  async function initialise() {
    console.log("INITIALISING");
    if (!process.env.AWS_LAMBDA_FUNCTION_VERSION) {
      let result = (resolve, reject) => {
        fs.readFile("../../Documents/config.json", "utf8", (err, data) => {
          if (err) {
            console.log(err);
            reject(err);
          }
          process.env = JSON.parse(data);
          dynamodb = new AWS.DynamoDB({
            apiVersion: "2012-08-10",
            accessKeyId: process.env.accessKeyId,
            secretAccessKey: process.env.secretAccessKey,
            region: process.env.region,
          });
          resolve(JSON.parse(data));
        });
      };
      return new Promise(result);
    } else {
      dynamodb = new AWS.DynamoDB({
        apiVersion: "2012-08-10",
        region: process.env.region,
      });
    }
  }

  async function makeRequest(user, id = null) {

    let ids = []
    let max_id;


    const oauth = new OAuth.OAuth(
      "https://api.twitter.com/oauth/request_token",
      "https://api.twitter.com/oauth/access_token",
      process.env.ConsumerKey,
      process.env.ConsumerSecret,
      "1.0A",
      null,
      "HMAC-SHA1"
    );
    return new Promise((resolve, reject) => {
      if (id) {
        max_id = `&max_id=${id}`
      } else {
        max_id = ''
      }
      oauth.get(
        `https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=${user}&count=5000&include_rts=false&exclude_replies=1&tweet_mode=extended${max_id}`,
        process.env.AccessToken,
        process.env.TokenSecret,
        (e, data, response) => {
          if (data && data.includes("full_text") && JSON.parse(data)[0].full_text && previous != JSON.parse(data)[0].full_text) {

            let formattedData = JSON.parse(data);
            previous = formattedData[0].full_text
            total += formattedData.length
            try {
              let tweets = JSON.parse(data).map(i => {
                ids.push(i.id)



                if (i.retweet_count > 200) {
                  let isoDate = new Date(i.created_at)
                  let now = moment().toISOString()
                  if(moment(now).diff(moment(isoDate), "days") > 50){
                  obj.add(i.full_text)
                  return i
                  }
                }
              })
              resolve([obj, ids.sort((a, b) => { return a - b })[0]])
            } catch (error) {
              console.log("error")
            }
            if (e) {
              console.log(e);
              reject(e);
            }
          } else {
            let tweets = Array.from(obj).map(i => {
              return { "tweet": i }
            })
            console.log(`${user} has`, tweets.length)
            try {
              let rt = FileReader().then(i=>{
                if(i){
                  tweets.push(...i)
                }
                fs.writeFile('reusedTweets.json', JSON.stringify(tweets), function (err) {
                  if (err) return console.log(err);
                  console.log('wrote file');
                });
              });
            } catch (error) {
              console.log("error rudegyal")
          console.log(error)
            }
            total += 4000;
            return

          }

        }

      );
    })

  }
  async function tester(user) {

    const oauth = new OAuth.OAuth(
      "https://api.twitter.com/oauth/request_token",
      "https://api.twitter.com/oauth/access_token",
      process.env.ConsumerKey,
      process.env.ConsumerSecret,
      "1.0A",
      null,
      "HMAC-SHA1"
    );
    let id = null;
    let total = 0
    let obj = []
    do {
      if (id) {
        let request = await makeRequest(user, id).then(i => {
          id = i[1]
        });
      } else {
        let request = await makeRequest(user).then(i => {
          id = i[1]
        });
      }
    } while (total < 2000)
    console.log(`${user} has`, obj.length)
  }

  async function FileReader(){
    return new Promise ((resolve, reject) =>{
      fs.readFile("./reusedTweets.json", "utf8", (err, data) => {
        if (err) {
          console.log(err);
          console.log("FR RUDEBOI")
          reject(err)
        }
        if(data && data.length > 10 ){
          console.log("we have data")
          resolve(JSON.parse(data))
        }else{
          console.log("we dont have data")
          resolve(false)
        }
      });
    })
  }

  await initialise();
  // await getTweetType();
  // await getQuoteNo(index);
  // await sendTweet(type);
  // await populateDB(item);
  let b = await tester("x")

  // console.log("a");



  return 1;
};

handler({ type: "software" });

