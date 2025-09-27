// Netlify Function: GET and POST /api/orders// Netlify Function: orders.js

const { Client } = require('pg');// Connects to Neon DB and handles order requests



exports.handler = async function(event, context) {const { database } = require('../../config/database');

  const client = new Client({ connectionString: process.env.NEON_DATABASE_URL });

  await client.connect();exports.handler = async function(event, context) {

  if (event.httpMethod === 'GET') {  // Add CORS headers for browser requests

    const res = await client.query('SELECT * FROM orders ORDER BY created_at DESC');  const headers = {

    await client.end();    'Access-Control-Allow-Origin': '*',

    return {    'Access-Control-Allow-Headers': 'Content-Type',

      statusCode: 200,    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',

      body: JSON.stringify(res.rows),    'Content-Type': 'application/json',

      headers: { 'Content-Type': 'application/json' }  };

    };

  } else if (event.httpMethod === 'POST') {  // Handle preflight requests

    const { items, created_by } = JSON.parse(event.body);  if (event.httpMethod === 'OPTIONS') {

    const orderRes = await client.query(    return {

      'INSERT INTO orders (created_by, status) VALUES ($1, $2) RETURNING id',      statusCode: 200,

      [created_by || 'mechanic', 'pending']      headers,

    );      body: '',

    const orderId = orderRes.rows[0].id;    };

    for (const item of items) {  }

      await client.query(

        'INSERT INTO order_items (order_id, product_name, product_code, quantity) VALUES ($1, $2, $3, $4)',  try {

        [orderId, item.name, item.code, item.quantity]    if (event.httpMethod === 'POST') {

      );      const orderData = JSON.parse(event.body);

    }      if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {

    await client.end();        return {

    return {          statusCode: 400,

      statusCode: 201,          headers,

      body: JSON.stringify({ orderId }),          body: JSON.stringify({ error: 'Order must contain at least one item' })

      headers: { 'Content-Type': 'application/json' }        };

    };      }

  } else {      // Insert order and order items

    await client.end();      const conn = database;

    return { statusCode: 405, body: 'Method Not Allowed' };      try {

  }        // Create order

};        const orderResult = await conn.run(
          'INSERT INTO orders (customer_email, total_items, created_at) VALUES (?, ?, NOW())',
          [orderData.customer_email || 'anonymous@example.com', orderData.items.length]
        );
        const orderId = orderResult.id;
        // Insert order items
        for (const item of orderData.items) {
          await conn.run(
            'INSERT INTO order_items (order_id, product_name, product_code, quantity) VALUES (?, ?, ?, ?)',
            [orderId, item.name, item.code, item.quantity]
          );
        }
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, orderId: orderId })
        };
      } catch (err) {
        throw err;
      }
    } else if (event.httpMethod === 'GET') {
      // List orders with items
      const orders = await database.all(
        `SELECT o.id, o.customer_email, o.total_items, o.created_at,
                (SELECT JSON_ARRAYAGG(JSON_OBJECT('name', oi.product_name, 'code', oi.product_code, 'quantity', oi.quantity))
                 FROM order_items oi WHERE oi.order_id = o.id) as items
         FROM orders o
         ORDER BY o.created_at DESC
         LIMIT 50`
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(orders)
      };
    }
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
    
  } catch (error) {
    console.error('Database error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to process order', 
        message: error.message 
      }),
    };
  }
};
