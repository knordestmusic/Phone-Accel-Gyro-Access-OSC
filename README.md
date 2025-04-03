# WebApp for Phone Sensors --> Max MSP

A web application that captures accelerometer and gyroscope data from a mobile device and streams it to Max MSP in real-time.

## Features

- Captures accelerometer (X, Y, Z) data from mobile devices
- Captures gyroscope (alpha, beta, gamma) data from mobile devices
- Creates a secure WebSocket connection between phone and server
- Transmits sensor data to Max MSP via UDP
- Configurable update rate for sensor data
- Works with both iOS and Android devices
- Proper OSC (Open Sound Control) formatting for Max MSP compatibility

## Prerequisites

- [Node.js](https://nodejs.org/) (v12 or higher)
- [Max MSP](https://cycling74.com/products/max) but works in anything since it's all over a UDP port.
- A mobile device with accelerometer and gyroscope sensors
- Computer and mobile device on the same network

## Installation

1. Download repository into one subdirectory. 

2. Install dependencies (in the same subdirectory).
   ```
   npm install
   ```

3. For external access, install ngrok:
   This app requries https secure connection to access phones sensor data from Google Chrome.
   [ngrok](https://dashboard.ngrok.com/signup) - free signup to ngrok to get a secure https server. Then install ngrok and follow instructions to authenticate. 
   ```
   npm install -g ngrok
   ```

4. To run the webapp, in terminal run (make sure you are in the correct subdirectory!)
   ```
   node server.js
   ```

5. In new terminal window run
   ```
   ngrok http 9000
   ```
   ngrok session will be activates and it will give you a mirror link (looks something like this  -  https://cc96-130-207-59-23.ngrok-free.app) that you can open in your phone!
   
 6. In chrome you might also need to enable Phone Sensor usage - 
   ```
   chrome://flags
   ```
   and search #enable-generic-sensor-extra-classes and enable it!
 

## Setting up Max MSP

1. Create a new Max patch
2. Add a [udpreceive 7400] object to receive sensor data (port 7400) and set computer's local host ID on the webapp (for me it was 127.0.0.1). 
3. Add [OSC-route /accelerometer /gyroscope] to separate the data streams
4. For each data stream, add [unpack f f f] to extract the X, Y, Z values
   



