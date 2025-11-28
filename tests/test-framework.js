import DbForgeClient from '../framework/src/client.js';
import dotenv from 'dotenv';
dotenv.config();

const API_URL = process.env.API_URL
const API_TOKEN = process.env.API_TOKEN

const client = DbForgeClient.fromApiToken({ apiUrl: API_URL, apiToken: API_TOKEN });

const run = async () => {
  try {
    console.log(await client.connect());
    console.log(await client.query('SELECT 1;'));
    console.log(await client.select('users', { limit: 5 }));
    console.log(await client.insert('users', { name: 'Pacheto', email: 'pacheto@test.com' }));
    console.log(await client.insert('users', { name: 'Boris', email: 'boris@test.com'}));
    console.log(await client.delete('users', {name: 'Pacheto'}));

  } finally {
    await client.disconnect();
  }
};


run().catch((err) => {
  console.error(err);
  process.exit(1);
});
