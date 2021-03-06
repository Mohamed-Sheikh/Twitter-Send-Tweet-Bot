const OAuth = require("oauth");
const reuse = require("./cleanedUp.json");
const tips = require("./softwareTweets.json");
const questions = require("./Questions.json");
const AWS = require("aws-sdk");
const fs = require("fs");

exports.handler = async (event) => {
  var item;
  var index;
  var type;
  var dynamodb;
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
  async function getTweetType() {
    if (!event.type) {
      index = 2;
      type = tips;
      item = "tipsNo";
    } else if (event.type == "reuse") {
      index = 1;
      type = reuse;
      item = "reuseNo";
    } else if (event.type == "question") {
      index = 0;
      type = questions;
      item = "questionsNo";
    }
  }

  async function getQuoteNo(index) {
    var params = {
      TableName: process.env.TableName,
    };
    let result = (resolve, reject) => {
      dynamodb.scan(params, function (err, data) {
        if (err) {
          console.log(err, err.stack);
          reject(err);
          return;
        } else {
          quoteNo = data.Items[index].value.N;
          console.log(data.Items);
          console.log("RETRIEVED QUOTE NO:", quoteNo);
          resolve(quoteNo);
        }
      });
    };
    return new Promise(result);
  }

  async function sendTweet(type) {
    console.log("QUOTe NO is ", quoteNo);
    console.log("SENDING TWEET");
    let tweetPost =
      index == 2
        ? `Tip ${quoteNo.toString()} - ${type[quoteNo].tweet}`
        : type[quoteNo].tweet;
    if (tweetPost.includes("undefined")) {
      console.log(" we have an undefined");
      return;
    }
    const oauth = new OAuth.OAuth(
      "https://api.twitter.com/oauth/request_token",
      "https://api.twitter.com/oauth/access_token",
      process.env.ConsumerKey,
      process.env.ConsumerSecret,
      "1.0A",
      null,
      "HMAC-SHA1"
    );
    let result = (resolve, reject) => {
      oauth.post(
        `https://api.twitter.com/1.1/statuses/update.json`,
        process.env.AccessToken,
        process.env.TokenSecret,
        { status: tweetPost },
        (e, data, response) => {
          if (response) {
          }
          if (data) {
            console.log("SENT ", type[quoteNo].tweet);
            resolve(data);
          }
          if (e) {
            console.log(e);
            reject(e);
          }
        }
      );
    };
    return new Promise(result);
  }
  async function populateDB(item) {
    let newQuoteNo = parseInt(quoteNo) + 1;
    var params = {
      Item: {
        live: { S: item },
        value: { N: newQuoteNo.toString() },
      },
      TableName: "Twitter-Bot-Table",
    };
    let result = (resolve, reject) => {
      dynamodb.putItem(params, (err, data) => {
        if (err) {
          console.log(err);
          reject(err);
        }
        if (data) {
          resolve("Updated");
          console.log("JUST POPULATED QUOTE NO" + newQuoteNo);
        }
      });
    };
    return new Promise(result);
  }

  await initialise();
  await getTweetType();
  await getQuoteNo(index);
  await sendTweet(type);
  await populateDB(item);
  const response = {
    statusCode: 200,
    body: JSON.stringify("Hello from Lambda!"),
  };
  return response;
};
