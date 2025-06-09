
// src/lib/mongodb.ts
import { MongoClient, ServerApiVersion, type Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

// These logs help verify what the application sees from .env.local
console.log(`[MongoDB Connection] MONGODB_URI from env: ${MONGODB_URI ? MONGODB_URI.replace(/:([^:@\s]+)@/, ':*****@') : 'NOT SET'}`);
console.log(`[MongoDB Connection] MONGODB_DB_NAME from env: ${MONGODB_DB_NAME || 'NOT SET'}`);

if (!MONGODB_URI) {
  console.error('[MongoDB Connection] CRITICAL ERROR: MONGODB_URI environment variable is not set. Please check your .env.local file.');
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}
if (!MONGODB_DB_NAME) {
  console.error('[MongoDB Connection] CRITICAL ERROR: MONGODB_DB_NAME environment variable is not set. Please check your .env.local file.');
  throw new Error('Invalid/Missing environment variable: "MONGODB_DB_NAME"');
}

let client: MongoClient;
export let clientPromise: Promise<MongoClient>; // Export clientPromise

// Aligning options with the MongoDB Atlas example
const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  // tls: true, // mongodb+srv implies TLS, removing explicit setting to match example simplicity
};

console.log(`[MongoDB Connection] MongoClient options being used: ${JSON.stringify(options)}`);

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  // @ts-ignore
  if (!global._mongoClientPromise) {
    console.log('[MongoDB Connection] Creating new MongoClient instance (development).');
    client = new MongoClient(MONGODB_URI, options);
    // @ts-ignore
    global._mongoClientPromise = client.connect()
      .then(connectedClient => {
        console.log('[MongoDB Connection] Successfully connected to MongoDB Atlas (development - global promise set).');
        return connectedClient;
      })
      .catch(err => {
        console.error('[MongoDB Connection] CRITICAL FAILURE during client.connect() (development - global promise):', err.message);
        console.error('[MongoDB Connection] PLEASE CHECK:');
        console.error('1. Your MONGODB_URI in .env.local is 100% correct (hostname, username, password).');
        console.error('2. Your MongoDB Atlas "Network Access" rules allow your current IP address.');
        console.error('3. Your firewall/antivirus/VPN is not interfering with the SSL/TLS connection.');
        console.error('4. The date and time on your system are correct.');
        throw err; // Rethrow to ensure the promise rejects and errors are propagated
      });
  } else {
     console.log('[MongoDB Connection] Reusing existing MongoClient instance (development - from global).');
  }
  // @ts-ignore
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  console.log('[MongoDB Connection] Creating new MongoClient instance (production).');
  client = new MongoClient(MONGODB_URI, options);
  clientPromise = client.connect()
    .then(connectedClient => {
      console.log('[MongoDB Connection] Successfully connected to MongoDB Atlas (production).');
      return connectedClient;
    })
    .catch(err => {
      console.error('[MongoDB Connection] CRITICAL FAILURE during client.connect() (production):', err.message);
      console.error('[MongoDB Connection] PLEASE CHECK:');
      console.error('1. Your MONGODB_URI in .env.local is 100% correct (hostname, username, password).');
      console.error('2. Your MongoDB Atlas "Network Access" rules allow your current IP address.');
      console.error('3. Your firewall/antivirus/VPN is not interfering with the SSL/TLS connection.');
      console.error('4. The date and time on your system are correct.');
      throw err;
    });
}

export async function getDb(): Promise<Db> {
  console.log('[MongoDB getDb] Awaiting clientPromise...');
  try {
    const connectedClient = await clientPromise;
    if (!connectedClient || typeof connectedClient.db !== 'function') {
        console.error('[MongoDB getDb] clientPromise resolved but client is not valid or not connected.');
        throw new Error('MongoDB client is not connected or invalid.');
    }
    console.log('[MongoDB getDb] clientPromise resolved successfully. Getting DB instance.');
    return connectedClient.db(MONGODB_DB_NAME);
  } catch (error: any) {
    console.error('[MongoDB getDb] Error resolving clientPromise or getting DB instance:', error.message);
    throw error;
  }
}

// Default export is removed as we now export clientPromise directly
// export default clientPromise;
