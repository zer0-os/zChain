

import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { MongoClient } from "mongodb";
import { AnalyticsData } from './types';

// express server
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

// mongodb initialization
// https://cloud.mongodb.com/v2/61d96dd874d7c8750ae25a99#metrics/replicaSet/6311bae61ebc253aa7946690/explorer/ZChain/network/find
const {
  mongoUrl, dbName, collectionName
} = {
  mongoUrl: "mongodb+srv://ratik21:Qazxcvbn%401234@cluster0.0wfupod.mongodb.net/?retryWrites=true&w=majority", 
  dbName: "ZChain", 
  collectionName: "network"
}

const mongoClient = new MongoClient(mongoUrl);
mongoClient.connect((err) => {
  if (err) {
    console.log("Error connecting to mongodb client: ", err);
  }
  console.log(`Connected to MongoDB!"`);
});

app.get('/', function (req, res) {
  res.send('Server for zChain Analytics');
});

app.post('/zchain/analytics', async function(req: Request, res: Response) {
  const data = req.body as AnalyticsData;
  const collection = mongoClient.db(dbName).collection(collectionName);

  const sourceIP = req.headers['x-forwarded-for'] ||
    req.socket.remoteAddress ||
    null;

  const nodeData = await collection.findOne({
    "peerId": data.peerId,
  });

  if (nodeData === null) {
    // create new entry for node data in db
    console.info("Creating new entry for node: ", data.peerId);
    await collection.insertOne({
      "ip": sourceIP,
      "messages": [
        {
          "message": data.message,
          "channel": data.channel,
          "network": data.network
        }
      ],
      "peerId": data.peerId,
      "version": data.version,
      "os": data.os,
      "storage": data.storage,
      "timestamp": data.timestamp      
    });
  }
  else {
    // else update entry for existing node data
    console.info("Updating existing entry for node: ", data.peerId);
    const updatedData = {
      "ip": sourceIP,
      "messages": [
        ...nodeData.messages ?? [],
        {
          "message": data.message,
          "channel": data.channel,
          "network": data.network
        }
      ],
      "version": data.version,
      "os": data.os,
      "storage": data.storage,
      "timestamp": data.timestamp      
    }
    
    await collection.findOneAndUpdate(
      { "peerId": data.peerId }, // filter
      { $set: { ...updatedData } } // atomic operation req. for update
    );
  }

  res.send(req.body);
}); 

app.use(function(req, res, next) {
    res.status(404).send("Route does not exist");
});

// start the server in the port 3000 !
app.listen(process.env.PORT || 3000, function () {
    console.log('App listening on port 3000.');
});