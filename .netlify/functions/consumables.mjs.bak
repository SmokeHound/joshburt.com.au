import { neon } from '@neondatabase/serverless';

export async function handler(event) {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const rows = await sql`SELECT * FROM consumables;`;
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        // 'Access-Control-Allow-Origin': '*', // Uncomment for local dev if needed
      },
      body: JSON.stringify({ products: rows }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
