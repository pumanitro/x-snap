// Startup wrapper that logs incoming requests for debugging
const http = require('http');
const { parse } = require('url');

console.log('[start] Loading Next.js server...');
console.log('[start] PORT:', process.env.PORT);
console.log('[start] HOSTNAME:', process.env.HOSTNAME);
console.log('[start] NODE_ENV:', process.env.NODE_ENV);
console.log('[start] CWD:', process.cwd());

// Check if server.js exists
const fs = require('fs');
const path = require('path');
const serverPath = path.join(process.cwd(), 'server.js');
console.log('[start] server.js exists:', fs.existsSync(serverPath));

// Just require the original server
require('./server.js');
