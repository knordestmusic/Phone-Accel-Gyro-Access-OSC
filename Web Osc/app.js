// DOM Elements
const connectBtn = document.getElementById('connect-btn');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const connectionStatus = document.getElementById('connection-status');
const ipAddressInput = document.getElementById('ip-address');
const portInput = document.getElementById('port');
const updateRateInput = document.getElementById('update-rate');

// Sensor data display elements
const accelX = document.getElementById('accel-x');
const accelY = document.getElementById('accel-y');
const accelZ = document.getElementById('accel-z');
const gyroAlpha = document.getElementById('gyro-alpha');
const gyroBeta = document.getElementById('gyro-beta');
const gyroGamma = document.getElementById('gyro-gamma');

// Variables
let websocket = null;
let isCapturing = false;
let updateInterval = null;
let sensorData = {
    accelerometer: { x: 0, y: 0, z: 0 },
    gyroscope: { alpha: 0, beta: 0, gamma: 0 }
};

// Check if device motion is available
if (window.DeviceMotionEvent) {
    console.log('DeviceMotionEvent is supported');
} else {
    alert('Your device or browser does not support the Device Motion API');
}

// Initialize event listeners
function init() {
    connectBtn.addEventListener('click', toggleConnection);
    startBtn.addEventListener('click', startCapturing);
    stopBtn.addEventListener('click', stopCapturing);
    updateRateInput.addEventListener('change', updateRate);
}

// Connect/disconnect WebSocket
function toggleConnection() {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        disconnectWebSocket();
    } else {
        connectWebSocket();
    }
}

// Connect to WebSocket server
function connectWebSocket() {
    // Extract the hostname from the current URL (this will be the ngrok URL)
    const currentHostname = window.location.hostname;
    const port = window.location.port || "";
    
    // Use the current domain for the WebSocket connection
    // This ensures we're connecting to the same ngrok domain
    const wsUrl = `wss://${currentHostname}${port ? ':' + port : ''}`;
    
    console.log("Connecting to WebSocket at:", wsUrl);
    
    try {
        websocket = new WebSocket(wsUrl);
        
        websocket.onopen = function() {
            connectionStatus.textContent = 'Connected';
            connectionStatus.classList.remove('disconnected');
            connectionStatus.classList.add('connected');
            connectBtn.textContent = 'Disconnect';
            startBtn.disabled = false;
        };
        
        websocket.onclose = function() {
            disconnectedUI();
        };
        
        websocket.onerror = function(error) {
            console.error('WebSocket error:', error);
            alert('WebSocket connection error. Check console for details.');
            disconnectedUI();
        };
    } catch (error) {
        console.error('Connection error:', error);
        alert('Failed to connect: ' + error.message);
        disconnectedUI();
    }
}

// Update UI when disconnected
function disconnectedUI() {
    connectionStatus.textContent = 'Disconnected';
    connectionStatus.classList.remove('connected');
    connectionStatus.classList.add('disconnected');
    connectBtn.textContent = 'Connect';
    startBtn.disabled = false;
    stopBtn.disabled = true;
    stopCapturing();
}

// Disconnect WebSocket
function disconnectWebSocket() {
    if (websocket) {
        websocket.close();
        websocket = null;
    }
    disconnectedUI();
}

// Start capturing sensor data
function startCapturing() {
    if (!isCapturing) {
        isCapturing = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        
        // Request permission for iOS 13+ devices
        if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
            DeviceMotionEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        window.addEventListener('devicemotion', handleMotion);
                        
                        // Start sending data at the specified interval
                        const updateRate = parseInt(updateRateInput.value) || 100;
                        updateInterval = setInterval(sendSensorData, updateRate);
                        
                        alert('Permission granted! You can now move your device to send sensor data.');
                    } else {
                        alert('Permission to access motion sensors was denied');
                        stopCapturing();
                    }
                })
                .catch(error => {
                    console.error('Error requesting device motion permission:', error);
                    alert('Error requesting permission: ' + error.message + '\nTry opening this page in Safari on iOS.');
                    stopCapturing();
                });
        } else {
            // Try directly adding event listener for non-iOS devices
            try {
                window.addEventListener('devicemotion', handleMotion);
                
                // Check if we're actually receiving events
                let motionReceived = false;
                const testHandler = () => {
                    motionReceived = true;
                    window.removeEventListener('devicemotion', testHandler);
                };
                window.addEventListener('devicemotion', testHandler);
                
                // Start sending data at the specified interval
                const updateRate = parseInt(updateRateInput.value) || 100;
                updateInterval = setInterval(() => {
                    sendSensorData();
                    
                    // If we haven't received any motion events after 1 second
                    if (!motionReceived && Date.now() - startTime > 1000) {
                        alert('Not receiving motion data. Your device or browser may not support the Device Motion API, or you may need to enable it in settings.');
                        stopCapturing();
                    }
                }, updateRate);
                
                const startTime = Date.now();
            } catch (error) {
                console.error('Error accessing device motion:', error);
                alert('Error accessing motion sensors: ' + error.message);
                stopCapturing();
            }
        }
    }
}

// Stop capturing sensor data
function stopCapturing() {
    if (isCapturing) {
        isCapturing = false;
        window.removeEventListener('devicemotion', handleMotion);
        clearInterval(updateInterval);
        startBtn.disabled = false;
        stopBtn.disabled = true;
    }
}

// Update the sending rate
function updateRate() {
    if (isCapturing) {
        clearInterval(updateInterval);
        const updateRate = parseInt(updateRateInput.value) || 100;
        updateInterval = setInterval(sendSensorData, updateRate);
    }
}

// Handle device motion event
function handleMotion(event) {
    // Accelerometer data
    if (event.accelerationIncludingGravity) {
        sensorData.accelerometer.x = roundToTwo(event.accelerationIncludingGravity.x);
        sensorData.accelerometer.y = roundToTwo(event.accelerationIncludingGravity.y);
        sensorData.accelerometer.z = roundToTwo(event.accelerationIncludingGravity.z);
        
        // Update display
        accelX.textContent = sensorData.accelerometer.x;
        accelY.textContent = sensorData.accelerometer.y;
        accelZ.textContent = sensorData.accelerometer.z;
    }
    
    // Gyroscope data
    if (event.rotationRate) {
        sensorData.gyroscope.alpha = roundToTwo(event.rotationRate.alpha);
        sensorData.gyroscope.beta = roundToTwo(event.rotationRate.beta);
        sensorData.gyroscope.gamma = roundToTwo(event.rotationRate.gamma);
        
        // Update display
        gyroAlpha.textContent = sensorData.gyroscope.alpha;
        gyroBeta.textContent = sensorData.gyroscope.beta;
        gyroGamma.textContent = sensorData.gyroscope.gamma;
    }
}

// Send sensor data via WebSocket
function sendSensorData() {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        const message = {
            type: 'sensorData',
            accelerometer: sensorData.accelerometer,
            gyroscope: sensorData.gyroscope,
            timestamp: Date.now()
        };
        
        websocket.send(JSON.stringify(message));
    }
}

// Utility function to round to two decimal places
function roundToTwo(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}

// Initialize the app
document.addEventListener('DOMContentLoaded', init);

// Handle page unload
window.addEventListener('beforeunload', function() {
    if (websocket) {
        websocket.close();
    }
});
