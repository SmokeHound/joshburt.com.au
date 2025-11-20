#!/usr/bin/env node
/**
 * API Documentation Generator
 * 
 * Automatically generates API documentation by scanning all Netlify Functions
 * and extracting endpoint information, methods, parameters, and responses.
 * 
 * Output: JSON file with OpenAPI-compatible specification
 */

const fs = require('fs');
const path = require('path');

const FUNCTIONS_DIR = path.join(__dirname, '..', 'netlify', 'functions');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'api-spec.json');

/**
 * Parse a JavaScript file to extract API documentation
 */
function parseFunction(filePath, fileName) {
  const content = fs.readFileSync(filePath, 'utf8');
  const functionName = fileName.replace('.js', '');
  
  // Extract JSDoc comments
  const jsdocPattern = /\/\*\*([\s\S]*?)\*\//g;
  const jsdocMatches = [...content.matchAll(jsdocPattern)];
  
  // Extract first comment (usually the main function description)
  let description = '';
  if (jsdocMatches.length > 0) {
    const firstComment = jsdocMatches[0][1];
    // Extract description from first line
    const firstLine = content.split('\n')[0];
    if (firstLine.includes('//')) {
      description = firstLine.replace('//', '').trim();
    } else {
      description = firstComment.split('\n')[0].trim();
    }
  } else {
    // Fallback: extract from first comment line
    const firstCommentMatch = content.match(/\/\/\s*(.+)/);
    if (firstCommentMatch) {
      description = firstCommentMatch[1].trim();
    }
  }
  
  // Detect HTTP methods supported
  const methods = [];
  if (content.includes("event.httpMethod === 'GET'") || content.includes('GET')) {
    methods.push('GET');
  }
  if (content.includes("event.httpMethod === 'POST'") || content.includes('POST')) {
    methods.push('POST');
  }
  if (content.includes("event.httpMethod === 'PUT'") || content.includes('PUT')) {
    methods.push('PUT');
  }
  if (content.includes("event.httpMethod === 'DELETE'") || content.includes('DELETE')) {
    methods.push('DELETE');
  }
  if (content.includes("event.httpMethod === 'PATCH'") || content.includes('PATCH')) {
    methods.push('PATCH');
  }
  
  // Default to GET if no methods detected
  if (methods.length === 0) {
    methods.push('GET');
  }
  
  // Detect authentication requirement
  const requiresAuth = content.includes('requireAuth') || 
                       content.includes('requirePermission') ||
                       content.includes('Authorization');
  
  // Detect pagination support
  const supportsPagination = content.includes('getPagination') || 
                            content.includes('page') ||
                            content.includes('limit');
  
  // Detect query parameters
  const queryParams = [];
  if (supportsPagination) {
    queryParams.push({ name: 'page', type: 'integer', description: 'Page number for pagination' });
    queryParams.push({ name: 'limit', type: 'integer', description: 'Items per page (max 100)' });
  }
  
  // Extract action parameter for multi-action endpoints
  const hasAction = content.includes('action');
  if (hasAction) {
    // Try to extract action values
    const actionPattern = /action\s*===?\s*['"](\w+)['"]/g;
    const actions = [...new Set([...content.matchAll(actionPattern)].map(m => m[1]))];
    if (actions.length > 0) {
      queryParams.push({ 
        name: 'action', 
        type: 'string', 
        description: `Action to perform: ${actions.join(', ')}`,
        enum: actions
      });
    }
  }
  
  // Detect response types
  const returnsArray = content.includes('rows') || 
                      content.includes('items') ||
                      content.includes('.map(');
  
  return {
    endpoint: `/.netlify/functions/${functionName}`,
    name: functionName,
    description: description || `${functionName} endpoint`,
    methods,
    requiresAuth,
    queryParams,
    supportsPagination,
    returnsArray,
    tags: [getCategoryFromName(functionName)]
  };
}

/**
 * Categorize endpoint based on name
 */
function getCategoryFromName(name) {
  if (name.includes('auth')) return 'Authentication';
  if (name.includes('user')) return 'Users';
  if (name.includes('product')) return 'Products';
  if (name.includes('order')) return 'Orders';
  if (name.includes('consumable')) return 'Consumables';
  if (name.includes('filter')) return 'Filters';
  if (name.includes('inventory')) return 'Inventory';
  if (name.includes('setting')) return 'Settings';
  if (name.includes('audit')) return 'Audit Logs';
  if (name.includes('notification')) return 'Notifications';
  if (name.includes('analytics')) return 'Analytics';
  if (name.includes('error')) return 'Error Tracking';
  if (name.includes('email')) return 'Email';
  if (name.includes('backup')) return 'Backups';
  if (name.includes('report')) return 'Reports';
  if (name.includes('search')) return 'Search';
  if (name.includes('health') || name.includes('public')) return 'Public';
  return 'Other';
}

/**
 * Generate OpenAPI specification
 */
function generateOpenAPISpec(endpoints) {
  const paths = {};
  
  endpoints.forEach(endpoint => {
    paths[endpoint.endpoint] = {};
    
    endpoint.methods.forEach(method => {
      const operation = {
        summary: endpoint.description,
        tags: endpoint.tags,
        parameters: [],
        responses: {
          200: {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: endpoint.returnsArray ? 'array' : 'object'
                }
              }
            }
          },
          400: { description: 'Bad Request' },
          401: { description: 'Unauthorized' },
          403: { description: 'Forbidden' },
          404: { description: 'Not Found' },
          500: { description: 'Internal Server Error' }
        }
      };
      
      // Add authentication security
      if (endpoint.requiresAuth) {
        operation.security = [{ bearerAuth: [] }];
      }
      
      // Add query parameters
      endpoint.queryParams.forEach(param => {
        operation.parameters.push({
          name: param.name,
          in: 'query',
          description: param.description,
          schema: {
            type: param.type,
            enum: param.enum
          }
        });
      });
      
      // Add request body for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        operation.requestBody = {
          content: {
            'application/json': {
              schema: {
                type: 'object'
              }
            }
          }
        };
      }
      
      paths[endpoint.endpoint][method.toLowerCase()] = operation;
    });
  });
  
  return {
    openapi: '3.0.0',
    info: {
      title: 'joshburt.com.au API',
      version: '1.0.0',
      description: 'Auto-generated API documentation for all Netlify Functions'
    },
    servers: [
      {
        url: 'https://joshburt.com.au',
        description: 'Production'
      },
      {
        url: 'http://localhost:8888',
        description: 'Local Development'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    paths
  };
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Scanning Netlify Functions...\n');
  
  // Ensure data directory exists
  const dataDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Read all function files
  const files = fs.readdirSync(FUNCTIONS_DIR)
    .filter(f => f.endsWith('.js'))
    .sort();
  
  console.log(`Found ${files.length} functions\n`);
  
  // Parse each function
  const endpoints = files.map(file => {
    const filePath = path.join(FUNCTIONS_DIR, file);
    const endpoint = parseFunction(filePath, file);
    console.log(`✓ ${endpoint.name}`);
    console.log(`  ${endpoint.methods.join(', ')} ${endpoint.endpoint}`);
    console.log(`  ${endpoint.description}`);
    if (endpoint.requiresAuth) {
      console.log(`  🔒 Requires authentication`);
    }
    console.log('');
    return endpoint;
  });
  
  // Generate OpenAPI spec
  const spec = generateOpenAPISpec(endpoints);
  
  // Write to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(spec, null, 2));
  
  console.log(`\n✅ API specification generated: ${OUTPUT_FILE}`);
  console.log(`📊 Total endpoints: ${endpoints.length}`);
  console.log(`🏷️  Categories: ${[...new Set(endpoints.flatMap(e => e.tags))].join(', ')}`);
  
  // Generate summary statistics
  const stats = {
    totalEndpoints: endpoints.length,
    authenticated: endpoints.filter(e => e.requiresAuth).length,
    public: endpoints.filter(e => !e.requiresAuth).length,
    supportsPagination: endpoints.filter(e => e.supportsPagination).length,
    byMethod: {
      GET: endpoints.filter(e => e.methods.includes('GET')).length,
      POST: endpoints.filter(e => e.methods.includes('POST')).length,
      PUT: endpoints.filter(e => e.methods.includes('PUT')).length,
      DELETE: endpoints.filter(e => e.methods.includes('DELETE')).length,
      PATCH: endpoints.filter(e => e.methods.includes('PATCH')).length
    }
  };
  
  console.log('\n📈 Statistics:');
  console.log(`  Authenticated: ${stats.authenticated}`);
  console.log(`  Public: ${stats.public}`);
  console.log(`  Pagination: ${stats.supportsPagination}`);
  console.log(`  Methods: GET=${stats.byMethod.GET}, POST=${stats.byMethod.POST}, PUT=${stats.byMethod.PUT}, DELETE=${stats.byMethod.DELETE}, PATCH=${stats.byMethod.PATCH}`);
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { parseFunction, generateOpenAPISpec, getCategoryFromName };
