const express = require('express')
const path = require('path')
const fs = require('fs');
const url = require('url');
const bodyParser = require('body-parser');
const { json } = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const favicon = require('serve-favicon');
const { Server } = require("socket.io");
const eiows = require("eiows");
const http = require('http');
const $ = require('jquery');
const { createProxyMiddleware } = require('http-proxy-middleware');
const axios = require('axios');
const cheerio = require('cheerio');

let erledigtCounter = 0
let BestellungCounter = 0


//http
const app = express();

//websocket
const io = new Server(9877, { cors: { origin: '*', credentials: true }});

const port = 9876;


//app.use(favicon(path.join(__dirname, '/', 'favicon.ico')));

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use('/public',express.static('public'));

app.get('/', (_, res) => {res.sendFile('/public/html/wikirunner.html', {root: __dirname })});
  
app.get('/mix', (_, res) => {res.sendFile('/public/html/results.html', {root: __dirname })});

app.listen(port, () => {console.log(`App listening on port ${port}!`)});


let orders = [[],[]];

io.on("connection", (socket) => {
  console.log("-----------------------");
  console.log("LOGGING FOR SCOKET: " + socket.id);
  io.emit("orders", {"orderItems": orders, "done": erledigtCounter})

  socket.on('ordering', (item, username) => {
    orders[0].push(username)
    orders[1].push(item)
    console.log(`User ${username} ordered: ${item}`);
    io.emit("orders", {"orderItems": orders, "done": erledigtCounter})
  }); 

  socket.on('finish', (item) => {
    orders[0].splice(item, 1)
    orders[1].splice(item, 1)
    erledigtCounter++
    io.emit("orders", {"orderItems": orders, "done": erledigtCounter})
    
  }); 
});



// Main HTML Proxy
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  try {
    const response = await axios.get(targetUrl);
    const $ = cheerio.load(response.data);
    const baseUrl = new URL(targetUrl);

    // Rewrite links to CSS/JS/imgs
    $('link[href], script[src], img[src]').each((_, el) => {
      const attr = el.name === 'link' || el.name === 'img' ? 'href' : 'src';
      const original = $(el).attr(attr);
      if (original && !original.startsWith('data:')) {
        const absolute = new URL(original, baseUrl).toString();
        $(el).attr(attr, `/proxy/resource?url=${encodeURIComponent(absolute)}`);
      }
    });

    $('a').each(function () {
    var $this = $(this),
        href = $this.attr('href');
    $this.attr('href', "http://127.0.0.1:9876/proxy?url=https://de.wikipedia.org/" + href);
})

    res.send($.html());
  } catch (err) {
    res.status(500).send('Proxy HTML error');
  }
});
// Asset Proxy (CSS, JS, images)
app.get('/proxy/resource', async (req, res) => {
  const assetUrl = req.query.url;
  if (!assetUrl) return res.status(400).send('Missing ?url param');
  try {
    const response = await axios.get(assetUrl, {
      responseType: 'arraybuffer', // handle binary data like images
    });

    res.set(response.headers); // forward original headers (content-type, etc)
    res.send(response.data);
  } catch (err) {
    res.status(500).send('Proxy resource error');
  }
});