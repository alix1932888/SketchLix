const socket = io();

let ctx = {};

const RANDOM_NICKNAMES = {
  adjectives: [
    "déshydraté",
    "chanceux",
    "touffu",
    "déjanté",
    "alléchant",
    "tumultueux",
    "gentil",
    "impatient",
  ],
  names: [
    "ours",
    "cheval",
    "dinosaure",
    "tabouret",
    "lion",
    "renard",
    "requin",
    "géant",
  ],
};

function generateRandomName() {
  const nameidx = Math.floor(Math.random() * RANDOM_NICKNAMES.names.length);
  const adjidx = Math.floor(Math.random() * RANDOM_NICKNAMES.adjectives.length);

  return `${RANDOM_NICKNAMES.names[nameidx]} ${RANDOM_NICKNAMES.adjectives[adjidx]}`;
}
// we use a function so that there is some realtime computations
const BOTTOM_BAR = {
  pencil: () => {
    return {
      html: `<div />`,
      startup: () => {
        ctx.pencilPoints = [];
      },
      onDraw: (x, y, size) => {
        strokeWeight(size);
        ctx.pencilPoints.push({ x, y });
        if (ctx.pencilPoints.length == 2) {
          line(
            ctx.pencilPoints[0].x,
            ctx.pencilPoints[0].y,
            ctx.pencilPoints[1].x,
            ctx.pencilPoints[1].y
          );
          ctx.pencilPoints.shift();
        }
      },
    };
  },
  circle: () => {
    return {
      html: `<div />`,
      startup: () => {},
      onDraw: (x, y, size) => circle(x, y, size),
    };
  },
  triangle: () => {
    return {
      html: `<div />`,
      startup: () => {},
      onDraw: (x, y, size) =>
        triangle(x - size, y + size / 2, x + size, y + size / 2, x, y - size),
    };
  },
  rectangle: () => {
    return {
      html: `<div />`,
      startup: () => {},
      onDraw: (x, y, size) =>
        rect(x - size / 2, y - size / 2, size, size, size / 10),
    };
  },
  clear : () => {
    return{
      html: `<div />`,
      startup: () => {
        socket.emit("reset");
      },
    }
  }
};

const REQ_MAP = {
  shape: ({ shape, x, y, size, color, nickname }) => {
    drawShape(x, y, size, color, BOTTOM_BAR[shape]().onDraw);
    $("#nickname-box").text(nickname);
  },
  reset: () =>{
    window.location.reload();
  }
};

const COLOR_BAR = [
  "#2c3e50",
  "#1abc9c",
  "#3498db",
  "#f1c40f",
  "#e74c3c",
  "#ffffff",
];

function setBackground(r = 240, g = 240, b = 240) {
  background(r, g, b);
}

function setBottomBar() {
  const bar = $("#footer-row");

  for (const [key, fct] of Object.entries(BOTTOM_BAR)) {
    const id = `zbtn-${key}`;
    const { html, startup, onDraw } = fct();

    bar.append(
      `<button class="btn btn-warning mx-2 card col-sm bar-box" id="${id}"><div class="card-body"><h6 class="card-title">${key}</h6></div>${html}</div></button>`
    );
    $(`#${id}`).on("click", () => {
      if (ctx.selectedBar === key) {
        return;
      }
      if (ctx.selectedBar) {
        $(`#zbtn-${ctx.selectedBar}`).removeClass("bar-selected");
      }
      ctx.selectedBar = key;
      $(`#zbtn-${ctx.selectedBar}`).addClass("bar-selected");
      ctx.shape = key;
      ctx.shapeCallback = onDraw;
      startup();
    });
    if (!("selectedBar" in ctx)) {
      $(`#${id}`).click();
    }
  }
}

function setColorBar() {
  const col = $("#flotter-col");

  for (let i = 0; i < COLOR_BAR.length; ++i) {
    const id = `zcolor-${i}`;
    const hexcolor = COLOR_BAR[i];
    col.append(
      `<button class="btn btn-primary my-2 card" id="${id}" style=""><div class="card-body" style="background-color: ${hexcolor};">${hexcolor}</div></div></button>`
    );
    $(`#${id}`).on("click", () => {
      if (ctx.selectedColor === i) {
        return;
      }
      if (ctx.selectedColor || ctx.selectedColor == 0) {
        $(`#zcolor-${ctx.selectedColor}`).removeClass("bar-selected");
      }
      ctx.selectedColor = i;
      ctx.color = hexcolor;
      $(`#zcolor-${ctx.selectedColor}`).addClass("bar-selected");
    });
    if (!("selectedColor" in ctx)) {
      $(`#${id}`).click();
    }
  }
}

function setDragRange() {
  ctx.drawSize = 10;
  $("#dragRange").val(ctx.drawSize);
  $("#dragRange").on("change", (object) => {
    ctx.drawSize = object.target.value * 2;
  });
}

function setNickname() {
  $("#nickname-box-input").val(generateRandomName());
}

function setSocketCallbacks() {
  for (const [key, callback] of Object.entries(REQ_MAP)) {
    socket.on(key, callback);
  }
  socket.emit("shapes");
}

function setup() {
  const width = windowWidth * 0.7;
  const height = windowHeight * 0.7;
  const cnv = createCanvas(width, height);

  cnv.position(windowWidth / 2 - width / 2, 30);
  setNickname();
  setBackground();
  setDragRange();
  setBottomBar();
  setColorBar();
  setSocketCallbacks();
}

function drawShape(x, y, size, color, callback) {
  stroke(color);
  fill(color);
  callback(x, y, size);
}

function draw() {
  if (mouseIsPressed) {
    if (ctx.shapeCallback) {
      socket.emit("shape", {
        shape: ctx.shape,
        x: mouseX,
        y: mouseY,
        size: ctx.drawSize,
        color: ctx.color,
        nickname: $("#nickname-box-input").val(),
      });
    }
  }
}
