const express = require("express");
const path = require("path");
const publicIp = require("public-ip");
const ip = require("ip");

const STATIC_FOLDER = path.join(__dirname, "static");

const app = express();
const PORT = process.env["PORT"] || 3000;
const httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer, {});

const SHAPE_PARAMS = ["shape", "x", "y", "size", "color", "nickname"];

let shapes = [];

let clients = {};

function verifyObject(object, keys) {
  for (const key of keys) {
    if (!(key in object)) return false;
  }
  return true;
}

function notifyClient(socket, shape) {
  socket.emit("shape", shape);
}

function notifyClients(shape) {
  for (const socket of Object.values(clients)) {
    notifyClient(socket, shape);
  }
}

function resendAll(socket) {
  for (const shape of shapes) {
    notifyClient(socket, shape);
  }
}

io.on("connection", (socket) => {
  clients[socket.client.id] = socket;
  console.info(`${socket.client.id} connected`);
  socket.on("disconnect", (reason) => {
    console.info(`${socket.client.id} disconnected: ${reason}`);
    delete clients[socket.client.id];
  });
  socket.on("shapes", () => {
    resendAll(socket);
  });
  socket.on("shape", (shape) => {
    if (verifyObject(shape, SHAPE_PARAMS) === true) {
      shapes.push(shape);
      notifyClients(shape);
    }
  });
  socket.on("reset", () => {
   for (const socket of Object.values(clients))
   {
     socket.emit("reset");
    }
  });
});

/* serve the static sketch page */
app.get("/", (req, res) => {
  res.sendFile(path.join(STATIC_FOLDER, "sketch.html"));
});

app.use(express.static(STATIC_FOLDER));

function formatIp(ipstring) {
  return `http://${ipstring}:${PORT}`;
}

/* Print public and private ipv4 ip to share with your friends */
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  publicIp.v4().then((value) => console.log(`Public IP: ${formatIp(value)}`));
  const localIp = ip.address("public", "ipv4");
  console.log(`Local IP: ${formatIp(localIp)}`);
});
