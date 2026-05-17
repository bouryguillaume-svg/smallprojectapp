// Node.js comes with a built-in "http" module — no installation needed.
// We load it here the same way you'd import a tool from a toolbox.
const http = require('http');

// We define which port the server listens on.
// Port 3000 is a common choice for local development.
const PORT = 3000;

// This function runs every time a request comes in.
// "req" contains info about the request (what the browser sent).
// "res" is what we use to send something back.
const server = http.createServer(function(req, res) {

  console.log(`Request received: ${req.method} ${req.url}`);

  // Tell the browser the response is plain text
  res.writeHead(200, { 'Content-Type': 'text/plain' });

  // Send the response and close the connection
  res.end('Hello from your Node.js server!');

});

// Start listening — the server is now running
server.listen(PORT, function() {
  console.log(`Server running at http://localhost:${PORT}`);
});
