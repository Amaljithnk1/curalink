import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const uri = process.env.MONGO_URI;
export const client = new MongoClient(uri);

export async function getDb() {
  if (!client.topology?.isConnected?.()) {
    await client.connect();
  }
  return client.db("curalink");
}