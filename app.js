const express = require('express')
const bodyParser = require('body-parser');
const favicon = require('serve-favicon');
const { Server } = require("socket.io");
const $ = require('jquery');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();


//https://en.wikipedia.org/w/api.php?format=json&action=query&generator=random&grnnamespace=0&prop=revisions|images&rvprop=content&grnlimit=10

const io = new Server(9877, { cors: { origin: '*', credentials: true }});
const port = 9876;


//app.use(favicon(path.join(__dirname, '/', 'favicon.ico')));

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use('/public',express.static('public'));
app.get('/', (_, res) => {res.sendFile('/public/html/wikirunner.html', {root: __dirname })});
app.get('/results', (_, res) => {res.sendFile('/public/html/results.html', {root: __dirname })});
app.listen(port, () => {console.log(`App listening on port ${port}!`)});



io.on("connection", (socket) => {
  console.log("-----------------------");
  console.log("LOGGING FOR SCOKET: " + socket.id);

  socket.on('ordering', (item, username) => {
    console.log(`User ${username} ordered: ${item}`);
    io.emit("orders", {"orderItems": ""})
  }); 

  socket.on('finish', (item) => {
    io.emit("orders", {"orderItems": ""})
    
  }); 
});



// Main HTML Proxy
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  try {
    const response = await axios.get(targetUrl);
    const $ = cheerio.load(response.data);
    const baseUrl = new URL(targetUrl);

    $('link[href], img[src]').each((_, el) => {
      	const attr = el.name === 'link' || el.name === 'img' ? 'href' : 'src';
      	const original = $(el).attr(attr);
		
		const absolute = new URL(original, baseUrl).toString()
		console.log(absolute)
		 $(el).attr(attr, `/proxy/resource?url=${encodeURIComponent(absolute)}`);
    });


    $('a').each(function () {
		let href = $(this).attr('href');
		if (href.startsWith('/w')) {
     		href = "https://de.wikipedia.org" + href
		}
		$(this).attr('href', "http://127.0.0.1:9876/proxy?url=" + href);
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
