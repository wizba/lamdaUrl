const express = require('express')
require('dotenv').config();
const bodyParser= require('body-parser')
const sls = require('serverless-http')
var TinyURL = require('tinyurl');
const { translate } = require('free-translate');
const AWS = require("aws-sdk");


const {  v1:uuidv1 } = require('uuid');
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const shortId = require('shortid');
var dynamodb = new AWS.DynamoDB({apiVersion: "2012-08-10"});

const app = express();

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.post('/shorten', (reqest, resposnse) => {
  let url = reqest.body.url;

  console.log(url);
  TinyURL.shorten(url)
  .then(function(res) {
      console.log(res)
      resposnse.status(200).json({url:res});
      
  }, function(err) {
      console.log(err)
    resposnse.status(401).json({error:err});
  });
  
});

app.get('/url', async (req, res, next) => {

 

  // Shorten with Alias Example
const data = { 'url': `https://my.wamly.io/verify/f5433432-2cde-463c-8db1-cf6280fa89b7/d2lsbGlhbUBjb21tYW5kcXVhbGl0eS5jby56YQ==/e9a8d347-ab89-4318-a4f0-c20b96e54284/V2lsbGlhbS9Db21tYW5kIFF1YWxpdHkgUHR5IEx0ZC9QYXJ0bmVyIEFQSSBTYW5pdHkvaW5mb0Bjb21tYW5kcXVhbGl0eS5jby56YS9PUEVOLzE1MC4w`, 'alias': 'custom-alias-for-wamly' }

let tnyUrl =""
console.log(data);
  TinyURL.shorten(data.url).
  then(function(shortUrl) {
    tnyUrl = shortUrl;
    console.log(tnyUrl);
    res.status(200).send( tnyUrl);
  })
  .catch(function(err) {
    res.status(404).send(err);
  });
  
})


// translate language


app.post('/translation', async (req, res, next) => {
  const {text,
    source,
    target,
    component,
    key
  } =req.body;

  try{
    const translatedText = await translate(text, { from: source, to: target });

    console.log(translatedText); // こんにちは世界

    // res.status(200).json({source:source,target:target,word:translatedText});
    res.status(200).json({text:translatedText,component:component,key:key});
  }catch(e){
    console.log(e);
    res.status(404).send(e);
  }


 })


 app.post('/short', async (reqest, resposnse) => {
  try{
    const TableName = process.env.DYNAMO_TABLE_NAME;
    let sUrl = reqest.body.url;
    
    let _id =shortId.generate();
    const params = {
      TableName,
      Item: {
        
        id: _id,
        source_url:sUrl
      },
      
        };
   
       dynamoDb.put(params).promise()
       .then(data => {
          console.log(data);
          console.log("data inserted");
          let params2 = {
            Key: {
              id: _id
            },
            TableName
          }
          dynamoDb.get(params2).promise()
          .then(data2 => {
            console.log(data2);
            data2.Item["url"] =process.env.HOST_NAME+'/key/' + data2.Item.id;
            resposnse.status(200).json(data2.Item)
          }
          ).catch(err => {
            console.log(err);
            resposnse.status(404).json({error:err});
          }
          );
       }).catch(err => {
          console.log(err);
          resposnse.status(404).json({error:err});
       })
       
   
    
  }
  catch(e){
    console.log(e);
    resposnse.status(404).json({message:e});
  }
  
});
app.get('/short/:shortUrl', async (req, res) => {
  const shortUrl = req.params.shortUrl;
  const TableName = process.env.DYNAMO_TABLE_NAME;
  const params = {
    Key: {
      id: shortUrl
    },
    TableName
   
  };

  console.log("table name === ",params);

  dynamoDb.get(params).promise()
    .then(data => {
      console.log(data);
      res.redirect(data.Item.source_url)
    }
    ).catch(err => {
      console.log(err);
      res.status(404).json({error:err});
    }
    );
})
module.exports.server = sls(app)