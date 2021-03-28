const express = require("express");
const formidable = require("formidable");
const path = require("path");
const publicIp = require("public-ip");
const fs = require("fs");
const ip = require("ip");
const Mongoose = require('mongoose');

const PUBLIC_FOLDER = path.join(__dirname, "public");
const STATIC_FOLDER = path.join(PUBLIC_FOLDER, "static");
const IMAGE_FOLDER = path.join(PUBLIC_FOLDER, "images");

const app = express();
const PORT = process.env["PORT"] || 3000;
const httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer, {});

const uri = "mongodb+srv://alix:ten@cluster0.bj2y1.mongodb.net/sketchlix?retryWrites=true&w=majority";

const SHAPE_PARAMS = ["shape", "x", "y", "size", "color", "nickname"];

let shapes = [];

let clients = {};

const imageSchema = Mongoose.Schema({
  username: String,
  path: String,
  date: Date
});

Mongoose.connect(uri, {
  useNewUrlParser: true,
  useFindAndModify: false,
  useUnifiedTopology: true
}).catch(error => {
  console.log("Can't connect to mongoose: ", error);
  console.log("Is the current ip whitelisted ?");
}).then(() => {
  console.log("connected successfully")
})

const ImageModel = Mongoose.model("Image", imageSchema)


if (!fs.existsSync(IMAGE_FOLDER)) {
  fs.mkdirSync(IMAGE_FOLDER);
}

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

const IO_REQ = {
  disconnect: (socket) => (reason) => {
    console.info(`${socket.client.id} disconnected: ${reason}`);
    delete clients[socket.client.id];
  },

  shapes: (socket) => () => {
    resendAll(socket);
  },
  shape: (socket) => (shape) => {
    if (verifyObject(shape, SHAPE_PARAMS) === true) {
      shapes.push(shape);
      notifyClients(shape);
    }
  },
  reset: (socket) => () => {
    shapes = [];
    for (const socket of Object.values(clients)) {
      socket.emit("reset");
    }
  }
};

io.on("connection", (socket) => {
  clients[socket.client.id] = socket;
  console.info(`${socket.client.id} connected`);

  for (const [key, callback] of Object.entries(IO_REQ)) {
    socket.on(key, callback(socket));
  }
});

/* serve the static sketch page */
app.get("/", (req, res) => {
  res.sendFile(path.join(STATIC_FOLDER, "sketch.html"));
});

app.get("/images", (req, res) => {
  res.sendFile(path.join(STATIC_FOLDER, "images.html"));
})

app.get("/uploads", async (req, res, next) => {
  const images = await ImageModel.find().lean();
  res.json(images);
})

app.get("/file/:path", (req, res) => {
  console.log(req.params.path);
  res.sendFile(path.join(IMAGE_FOLDER, req.params.path));
})


app.post("/upload", (req, res, next) => {
  const form = formidable({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      next(err);
      return;
    }
    const base64Data = fields.image.replace(/^data:image\/png;base64,/, "");
    const now = new Date();
    const today = now.toISOString().split(':')[0].split('T')[0];
    const relativePath = `${fields.username}-${today}-${now.getUTCHours()}-${now.getUTCMinutes()}-${now.getUTCSeconds()}-${(now.getMilliseconds() / 1000).toFixed(3).slice(2, 5)}.png`;
    const pathname = path.join(IMAGE_FOLDER, relativePath);
    fs.writeFile(pathname, base64Data, 'base64', function (err) {
      if (err) {
        console.error(err);
      }
    });
    console.log(`user ${fields.username} added file at ${pathname}.`);

    const newImage = await new ImageModel({
      username: fields.username,
      path: relativePath,
      date: now
    });

    newImage.save();
  });
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