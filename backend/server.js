// server.js (Node/Express + ws)
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// In-memory store for signaling & connections
const connections = {};

wss.on('connection', (socket) => {
  console.log('New WebSocket connection');

  socket.on('message', async (rawData) => {
    // 1. Try to parse as JSON (signaling) else treat as audio chunk
    let data;
    try {
      data = JSON.parse(rawData.toString());
    } catch (err) {
      // This is likely binary audio data
      // Save chunk to a temp file and call STT
      const audioFileName = `temp_${uuidv4()}.webm`;
      fs.writeFileSync(audioFileName, rawData);  // naive sync for demo

      try {
        // call STT microservice
        const sttRes = await axios.post(
          'http://localhost:8000/speech-to-text-translate',
          fs.createReadStream(audioFileName),
          {
            headers: {
              'Content-Type': 'audio/webm'
            }
          }
        );
        const transcript = sttRes.data.transcript;
        console.log("Transcript:", transcript);

        // Now call LLaMA service with that transcript
        const aiRes = await axios.post(
          'http://localhost:8001/generate-response',
          { input_text: transcript }
        );
        const { response_text, emotion } = aiRes.data;
        console.log("AI Response:", response_text);

        // Send result back to the client
        socket.send(JSON.stringify({
          type: 'transcript',
          payload: transcript
        }));
        socket.send(JSON.stringify({
          type: 'ai-response',
          payload: { response_text, emotion }
        }));

      } catch (apiErr) {
        console.error("STT or LLaMA error:", apiErr.message);
      } finally {
        // cleanup
        fs.unlinkSync(audioFileName);
      }
      return;
    }

    // 2. If we get here, data is a signaling message
    switch (data.type) {
      case 'offer':
        // Echo back to all (or store in memory). For a single peer, we do a simpler approach:
        socket.offer = data.payload;
        wss.clients.forEach((client) => {
          if (client !== socket && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'offer', payload: data.payload }));
          }
        });
        break;
      case 'answer':
        wss.clients.forEach((client) => {
          if (client !== socket && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'answer', payload: data.payload }));
          }
        });
        break;
      case 'ice-candidate':
        wss.clients.forEach((client) => {
          if (client !== socket && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'ice-candidate', payload: data.payload }));
          }
        });
        break;
      default:
        console.log("Unknown signaling type:", data.type);
        break;
    }
  });

  socket.on('close', () => {
    console.log('WebSocket closed');
  });
});

// Start server
server.listen(3000, () => {
  console.log('Signaling + audio server running on http://localhost:3000');
});
