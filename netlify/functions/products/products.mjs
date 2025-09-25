// netlify/functions/products/products.mjs
import { neon } from '@neondatabase/serverless';

export async function handler(event) {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const rows = await sql('SELECT * FROM products;');
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        // Uncomment below for local development if needed:
        // 'Access-Control-Allow-Origin': '*',
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