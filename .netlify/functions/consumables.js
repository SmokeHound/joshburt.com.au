// Netlify Function: Full CRUD for consumables
const { database } = require('../../config/database');

exports.handler = async function(event, context) {
    // Always define CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json',
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
    // Initialize database connection
        await database.connect();

        switch (event.httpMethod) {
        case 'GET':
            return await handleGet(event, headers);
        case 'POST':
            return await handlePost(event, headers);
        case 'PUT':
            return await handlePut(event, headers);
        case 'DELETE':
            return await handleDelete(event, headers);
        default:
            return {
                statusCode: 405,
                headers,
                body: JSON.stringify({ error: 'Method Not Allowed' }),
            };
        }
    } catch (error) {
        console.error('Database error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Database operation failed', message: error.message }),
        };
    }

    async function handleGet(event, headers) {
        try {
            let query = 'SELECT * FROM consumables ORDER BY name';
            let params = [];
            // Optional filters
            const { type, category } = event.queryStringParameters || {};
            if (type && category) {
                query = 'SELECT * FROM consumables WHERE type = ? AND category = ? ORDER BY name';
                params = [type, category];
            } else if (type) {
                query = 'SELECT * FROM consumables WHERE type = ? ORDER BY name';
                params = [type];
            } else if (category) {
                query = 'SELECT * FROM consumables WHERE category = ? ORDER BY name';
                params = [category];
            }
            const consumables = await database.all(query, params);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(consumables),
            };
        } catch (error) {
            console.error('GET error:', error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to fetch consumables' }),
            };
        }
    }

    async function handlePost(event, headers) {
        try {
            const body = JSON.parse(event.body);
            const { name, code, type, category, description } = body;
            if (!name || !type || !category) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Missing required fields: name, type, category' }),
                };
            }
            const query = `
        INSERT INTO consumables (name, code, type, category, description)
        VALUES (?, ?, ?, ?, ?)
      `;
            const params = [name, code || '', type, category, description || ''];
            const result = await database.run(query, params);
            return {
                statusCode: 201,
                headers,
                body: JSON.stringify({ 
                    id: result.id, 
                    message: 'Consumable created successfully',
                    consumable: { id: result.id, name, code, type, category, description }
                }),
            };
        } catch (error) {
            console.error('POST error:', error);
            if (error.message.includes('UNIQUE constraint')) {
                return {
                    statusCode: 409,
                    headers,
                    body: JSON.stringify({ error: 'Consumable code already exists' }),
                };
            }
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to create consumable' }),
            };
        }
    }

    async function handlePut(event, headers) {
        try {
            const body = JSON.parse(event.body);
            const { id, name, code, type, category, description } = body;
            if (!id || !name || !type || !category) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Missing required fields: id, name, type, category' }),
                };
            }
            const query = `
        UPDATE consumables 
        SET name = ?, code = ?, type = ?, category = ?, description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
            const params = [name, code || '', type, category, description || '', id];
            const result = await database.run(query, params);
            if (result.changes === 0) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Consumable not found' }),
                };
            }
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ 
                    message: 'Consumable updated successfully',
                    consumable: { id, name, code, type, category, description }
                }),
            };
        } catch (error) {
            console.error('PUT error:', error);
            if (error.message.includes('UNIQUE constraint')) {
                return {
                    statusCode: 409,
                    headers,
                    body: JSON.stringify({ error: 'Consumable code already exists' }),
                };
            }
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to update consumable' }),
            };
        }
    }

    async function handleDelete(event, headers) {
        try {
            const { id } = JSON.parse(event.body);
            if (!id) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Missing required field: id' }),
                };
            }
            const result = await database.run('DELETE FROM consumables WHERE id = ?', [id]);
            if (result.changes === 0) {
                return {
                    statusCode: 404,
                    headers,
                    body: JSON.stringify({ error: 'Consumable not found' }),
                };
            }
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'Consumable deleted successfully' }),
            };
        } catch (error) {
            console.error('DELETE error:', error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Failed to delete consumable' }),
            };
        }
    }
};