const express = require('express')
const bodyParser = require('body-parser');
const favicon = require('serve-favicon');
const { Server } = require("socket.io");
const $ = require('jquery');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const config = require('config');
const fs = require('fs');
const pino = require('pino');
const { createProxyMiddleware } = require('http-proxy-middleware');

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
})

// config
const port = config.get('server.port');
const proxyPort = config.get('server.proxyPort')
const host = config.get('server.host');
const protocol = (config.get("server.encrypted")) ? "https" : "http";
let maxHops = config.get('game.hopTarget');


const io = new Server(proxyPort, { cors: { origin: '*', credentials: true }});
activeRooms = []
const games = new Map();

class Game {
	startTime = 0
	ScreenState = "lobby"
	voteRunning = false
	finishedUsers = []
	timeStamps = []
	linksClickedList = []
	votePositiveCounter = 0
	voteNegativeCounter = 0
	userVoteList = []
	hopCounter = 0
	startURL
	endURL
	constructor() {}

}

function getGame(room) {
	let game = new Game()
	try {
		game = games.get(room)
	}catch {
		logger.warn(`Accessing uninitialized Game Room ${room}. Returning default`)
	}
	return game
}

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use('/public',express.static('public'));
app.use(favicon(__dirname + '/public/assets/favicon.ico'));
app.get('/', (_, res) => {res.sendFile('/public/html/wikirunner.html', {root: __dirname })});
app.get('/admin', (_, res) => {res.sendFile('/public/html/admin.html', {root: __dirname })});
app.listen(port, () => {logger.info(`App listening on port ${port}!`)});
logger.info("Protocol: " + protocol)
logger.info("Host: " + host)
logger.info("Proxy Port: " + proxyPort)

function createRoom() {
  while (true){
    roomCode = Math.round(Math.random() * (9999 - 1000) + 1000);
    if (!activeRooms.includes(roomCode)) {
      return roomCode
    }
  }
}


function fetchRandomArticle(room) {
	let g = getGame(room)
	return new Promise((resolve, reject) => {
		const URL = "https://de.wikipedia.org/api/rest_v1/page/random/summary"
		fetch(URL)
			.then(response => {
				if (!response.ok) {
				throw new Error('Network response was not ok');
				}
				return response.json();
			})
			.then(data => {
				g.startURL = data.content_urls.desktop.page
				resolve(g.startURL)
			})
			.catch(err => {
				logger.error("Error fetching random article:", err);
				reject(err);
			});
	});
}

function fetchRelatedGoalArticle(room, URL) {
	let g = getGame(room)
	return new Promise((resolve, reject) => {
		let articles = [];
		logger.trace("URL: " + URL);
		
		fetch(URL)
			.then(res => res.text())
			.then(html => {
				const $ = cheerio.load(html);
				const element = $(".mw-page-container-inner").first();

				element.find('a').each((i, link) => {
					const href = $(link).attr('href');
					if (
						href &&
						href.includes("/wiki/") &&
						href.includes("de.wikipedia.org")
					) {
						const blacklist = config.get('game.blacklist');
						let isAllowed = true;
						blacklist.forEach((element) => {
							if (href.includes(element)) {
								isAllowed = false
							}
						});
						if(isAllowed) {articles.push(href);}
					}
				});

				if (articles.length > 0) {
					const rand = Math.floor(Math.random() * articles.length);
					const article = articles[rand];

					logger.info(`Found ${articles.length} articles. Using ${article}`);

					if (g.hopCounter < maxHops) {
						g.hopCounter++;
						fetchRelatedGoalArticle(room, article).then(resolve).catch(reject);
					} else {
						g.endURL = article;
						resolve(g.endURL);
					}
				} else {
						g.endURL = URL
						resolve(g.endURL);
				}
			})
			.catch(err => {
				logger.fatal("Fetch error:", err);
				reject(err);
			});
	});
}



io.on("connection", (socket) => {
	socket.on("createLobby", (callback) => {
		const roomCode = createRoom().toString()
		logger.debug(roomCode)
		activeRooms.push(roomCode)  	
		games.set(roomCode, new Game())
		socket.join(roomCode)
		callback({
      		room: roomCode
    	});
	})
	socket.on("joinLobby", (room, callback) => {
		let g = getGame(room)
		success = true
		activeRooms.includes(room) ? socket.join(room) : success = false
		logger.debug("rooms" + activeRooms)
		logger.debug("room:" + room)
		callback({
      		status: success,
			voting: g.voteRunning,
			ScreenState: g.ScreenState,
			startURL:g.startURL,
			endURL: g.endURL
    	});
	})

	

	socket.on("reconnecting", (room) => {
		let g = getGame(room)
		io.emit("updateScoreBoard", {"users": g.finishedUsers, "times" : g.timeStamps})

		if (voteRunning) {
			io.emit("voteRunning", g.endURL)
			io.emit("updateVotingStats", {"needed": io.sockets.adapter.rooms.get(room).size , "positive" : g.votePositiveCounter, "negative" : g.voteNegativeCounter})
		}
		if (ScreenState == "running") {
			io.emit("reconnecting", {"startURL": g.startURL, "endURL": g.endURL})
			io.emit("updateScoreBoard", {"users": g.finishedUsers, "times" : g.timeStamps, "linksClickedList" : g.linksClickedList})
		}	
	})

	function getNextItems(room) {
		let g = getGame(room)
		g.voteRunning = true
		g.votePositiveCounter = 0
		g.voteNegativeCounter = 0
		g.hopCounter = 0
		io.to(room).emit("updateVotingStats", {"needed": io.sockets.adapter.rooms.get(room).size , "positive" : g.votePositiveCounter, "negative" : g.voteNegativeCounter})
		fetchRandomArticle(room)
		.then(() => {
			g.startURL = `${protocol}://${host}/proxy?url=` + g.startURL
			logger.debug("starting at: " + g.startURL)
			fetchRelatedGoalArticle(room, g.startURL)
			.then(() => {
				logger.debug("Goal is: " + g.endURL + ". Managed to achieve a Hop count of " + g.hopCounter)
				io.to(room).emit("reviewItems", g.endURL)
			})
		})
		.catch(err => {
			logger.fatal("Error starting game:", err);
		});
		logger.debug(games)
	}
	socket.on("getNextItems", (room) => {
		getNextItems(room)
	})

	socket.on("closeGame", (room) => {
		let g = getGame(room)
		g.ScreenState = "lobby";
		io.to(room).emit("closeGameOnClients")
	})

	socket.on('UserFinished', (room, user, linksClicked, success = true) => {
		let g = getGame(room)
		logger.info(user + " has finished")
		updateScoreboardDB(room, user, linksClicked, success)
		io.to(room).emit("finishNotification", user, linksClicked.length)
		io.to(room).emit("updateScoreBoard", {"users": g.finishedUsers, "times" : g.timeStamps, "linksClickedList" : g.linksClickedList})
  	}); 

	socket.on("voteUseItem", (room, vote, username) => {
		const needed = io.sockets.adapter.rooms.get(room).size / 2
		let g = getGame(room)
		if (!g.userVoteList.includes(username)) {
			g.userVoteList.push(username)
			vote ? g.votePositiveCounter++ : g.voteNegativeCounter++

			io.to(room).emit("updateVotingStats", {"needed": needed, "positive" : g.votePositiveCounter, "negative" : g.voteNegativeCounter})

			if (g.votePositiveCounter >=  needed) {
				g.finishedUsers = []
				g.timeStamps = []
				g.linksClickedList = []
				g.userVoteList = []
				g.hopCounter = 0
				g.votePositiveCounter = 0
				g.voteNegativeCounter = 0
				io.to(room).emit("starting", {"startURL": g.startURL, "endURL": g.endURL})
				g.startTime = Date.now();
				g.ScreenState = "running";
				g.voteRunning = false;
			}else if (g.voteNegativeCounter > needed) {
				g.userVoteList = []
				getNextItems(room)
			}
			else{
				logger.info(`${g.votePositiveCounter} voted positive, ${needed - g.votePositiveCounter} more votes needed!`)
			}
		}
	})
});

function updateScoreboardDB(room, user, linksClicked, success) {
	console.log(room)
	let g = getGame(room)
	let alreadyFound = false
	let ms = 0

	console.log(g)
	if (success) {
		ms = (Date.now() - g.startTime)  / 1000;
	}else{
		ms = "DNF"
	}
	console.log(ms)
	g.finishedUsers.forEach(function (item, index) {
		if (item == user) {
			g.linksClickedList[index] = linksClicked
			g.timeStamps[index] = ms
			alreadyFound = true
		}
	});
	if (!alreadyFound) {
		g.finishedUsers.push(user)
		g.linksClickedList.push(linksClicked)
		g.timeStamps.push(ms)
	}
}

// Main HTML Proxy
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  try {
    const response = await axios.get(targetUrl);
    const $ = cheerio.load(response.data);
    const baseUrl = new URL(targetUrl);


    $('link[href], img[src]').each((_, el) => {
      	const attr = el.name === 'link' ? 'href' : 'src';
      	const original = $(el).attr(attr);
		
		const absolute = new URL(original, baseUrl).toString()
		 $(el).attr(attr, `/proxy/resource?url=${encodeURIComponent(absolute)}`);
    });


    $('a').each(function () {
		try {
			let href = $(this).attr('href');
			if (href.startsWith('/w')) {
	     		href = "https://de.wikipedia.org" + href
			}else if (href.startsWith('#')) {
				href = targetUrl + href
			}
			$(this).attr('href', `${protocol}://${host}/proxy?url=` + href);
		} catch (err) {
			//console.log("Proxy rewrite failed for" + $(this) + " because " + err)
		}
	})

    res.send($.html());
  } catch (err) {
    res.status(500).send('Och nee, der Proxy ist doof' + err);
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
