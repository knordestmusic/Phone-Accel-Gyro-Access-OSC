const WebSocket = require('ws');
const dgram = require('dgram');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const WS_PORT = 9000;        // WebSocket port
const MAX_UDP_PORT = 7400;   // Port to send data to Max MSP
const MAX_UDP_HOST = '127.0.0.1'; // IP address of the computer running Max MSP

// Create UDP socket for sending data to Max MSP
const udpClient = dgram.createSocket('udp4');

// Create HTTP server
const server = http.createServer((req, res) => {
    // Simple file server for the web app
    let filePath = req.url === '/' ? './index.html' : '.' + req.url;
    
    // Add special handling for WebSocket upgrade requests from ngrok
    if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const extname = path.extname(filePath);
    
    const contentTypeMap = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
    };
    
    const contentType = contentTypeMap[extname] || 'text/plain';
    
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Create WebSocket server
const wss = new WebSocket.Server({ 
    server: server,
    // This allows connections from any origin (important for ngrok)
    verifyClient: () => true
});

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('Client connected');
    
    // Handle incoming messages
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'sensorData') {
                console.log('Received sensor data:', data.accelerometer, data.gyroscope);
                
                // Create separate OSC messages for accelerometer and gyroscope data
                const accelBuffer = createOSCMessage('/accelerometer', [
                    data.accelerometer.x,
                    data.accelerometer.y,
                    data.accelerometer.z
                ]);
                
                const gyroBuffer = createOSCMessage('/gyroscope', [
                    data.gyroscope.alpha,
                    data.gyroscope.beta,
                    data.gyroscope.gamma
                ]);
                
                // Send each message individually to Max MSP
                udpClient.send(accelBuffer, MAX_UDP_PORT, MAX_UDP_HOST, (err) => {
                    if (err) {
                        console.error('Error sending accelerometer data to Max MSP:', err);
                    }
                });
                
                udpClient.send(gyroBuffer, MAX_UDP_PORT, MAX_UDP_HOST, (err) => {
                    if (err) {
                        console.error('Error sending gyroscope data to Max MSP:', err);
                    }
                });
            }
        } catch (e) {
            console.error('Error processing message:', e);
        }
    });
    
    // Handle client disconnection
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// Helper function to create a properly formatted OSC message
function createOSCMessage(address, args) {
    // Calculate the size of the address string (including null termination)
    // and pad to a multiple of 4 bytes
    const addressLen = Math.ceil((address.length + 1) / 4) * 4;
    
    // Create the type tag string, starting with ',' followed by 'f' for each float argument
    const typeTag = ',' + 'f'.repeat(args.length);
    const typeTagLen = Math.ceil((typeTag.length + 1) / 4) * 4;
    
    // Each float is 4 bytes
    const argsLen = args.length * 4;
    
    // Create a buffer with the appropriate size
    const buffer = Buffer.alloc(addressLen + typeTagLen + argsLen);
    
    // Write the address and null-terminate
    buffer.write(address);
    buffer[address.length] = 0;
    
    // Write the type tag starting at the next 4-byte boundary
    buffer.write(typeTag, addressLen);
    buffer[addressLen + typeTag.length] = 0;
    
    // Write the arguments as 32-bit floats
    args.forEach((arg, i) => {
        buffer.writeFloatBE(arg, addressLen + typeTagLen + (i * 4));
    });
    
    return buffer;
}

// Start server
server.listen(WS_PORT, () => {
    console.log(`Server running at http://localhost:${WS_PORT}/`);
    console.log(`Forwarding data to Max MSP at ${MAX_UDP_HOST}:${MAX_UDP_PORT}`);
});

// Handle server shutdown
process.on('SIGINT', () => {
    udpClient.close();
    process.exit();
});
