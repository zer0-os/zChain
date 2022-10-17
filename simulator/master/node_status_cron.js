const { MongoClient } = require("mongodb");
const delay = require("delay");

async function updateNodeStatus() {
  /**
   * Connection URI. Update <username>, <password>, and <your-cluster-url> to reflect your cluster.
   * See https://docs.mongodb.com/ecosystem/drivers/node/ for more details
   */
  const uri = "mongodb+srv://ratik21:Qazxcvbn%401234@cluster0.0wfupod.mongodb.net/?retryWrites=true&w=majority";
  const client = new MongoClient(uri);

  try {
    // Connect to the MongoDB cluster
    await client.connect();
    console.log("Connected to Mongo");

    const collection = client
      .db("ZChain")
      .collection("network");
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
  } catch (e) {
    console.error(e);
  }
}

async function main() {
	while(true) {
		await updateNodeStatus();
		console.log('\n\n\n\n\n\n\n'); // add some space b/w next run

		// wait 15 seconds before running
		await delay(15 * 1000);
	}				
}

main();
