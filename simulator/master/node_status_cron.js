const { MongoClient } = require("mongodb");
const delay = require("delay");
require('dotenv').config()

async function updateNodeStatus(client) {
  const collection = client
    .db(process.env.DB_NAME)
    .collection(process.env.COLLECTION_NAME);
  const collections = await collection.find().toArray();
  for (const c of collections) {
    const currentTs =  Math.floor((new Date()).getTime() / 1000);
    const lastTs = c["timestamp"];
    if (!lastTs) { continue; }
    
    let status = ''; // online or offline or inactive
    const weekInSeconds = 604800; // 7 * 24 * 60 * 60
    if (currentTs - lastTs >= weekInSeconds) {
      status = 'inactive';
    } else if (currentTs - lastTs >= 41) { // if node hasn't sent a msg in 40s, then mark offline
      status = 'offline';
    } else {
      //status = 'online';
    }

    if (status === '') { continue; }

    await collection.findOneAndUpdate(
      { "peerId": c["peerId"] }, // filter
      { $set: { status: status } } // atomic operation req. for update
    );
  }
}

async function main() {
  /**
   * Connection URI. Update <username>, <password>, and <your-cluster-url> to reflect your cluster.
   * See https://docs.mongodb.com/ecosystem/drivers/node/ for more details
   */
  const client = new MongoClient(process.env.MONGODB_URL);

  try {
    // Connect to the MongoDB cluster
    await client.connect();
    console.log("Connected to Mongo");

    while(true) {
      await updateNodeStatus(client);
      console.log('Done\n\n'); // add some space b/w next run
  
      // wait 15 seconds before running
      await delay(15 * 1000);
    }
  }
  catch (e) {
    console.error(e);
  }
			
}

main();
