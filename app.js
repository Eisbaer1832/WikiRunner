const express = require('express')
const bodyParser = require('body-parser');
const favicon = require('serve-favicon');
const { Server } = require("socket.io");
const $ = require('jquery');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const config = require('config');

// config
const port = config.get('server.port');
const proxyPort = config.get('server.proxyPort')
const host = config.get('server.host');
const protocol = (config.get("server.encrypted")) ? "https" : "http";

let maxHops = config.get('game.hopTarget');


const io = new Server(proxyPort, { cors: { origin: '*', credentials: true }});



let startTime = 0
let gameRunning = false
let finishedUsers = []
let timeStamps = []
let linksClickedList = []
let votePositiveCounter = 0
let voteNegativeCounter = 0
let hopCounter = 0
let voteRunning = false
let startURL = "http://" + host + "/proxy?url=https://de.wikipedia.org/wiki/Haus"
let endURL = "http://127.0.0.1:9876/proxy?url=https://de.wikipedia.org/wiki/Baracke"

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use('/public',express.static('public'));
app.use(favicon(__dirname + '/public/assets/favicon.ico'));
app.get('/', (_, res) => {res.sendFile('/public/html/wikirunner.html', {root: __dirname })});
app.get('/admin', (_, res) => {res.sendFile('/public/html/admin.html', {root: __dirname })});
app.listen(port, () => {console.log(`App listening on port ${port}!`)});
console.log("Protocol: " + protocol)
console.log("Host: " + host)
console.log("Proxy Port: " + proxyPort)

function fetchRandomArticle() {
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
				startURL = data.content_urls.desktop.page
				resolve(startURL)
			})
			.catch(err => {
				console.error("Error fetching random article:", err);
				reject(err);
			});
	});
}

function fetchRelatedGoalArticle(URL) {
	return new Promise((resolve, reject) => {
		let articles = [];
		console.log("URL: " + URL);
		
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

					console.log(`Found ${articles.length} articles`);

					if (hopCounter < maxHops) {
						hopCounter++;
						fetchRelatedGoalArticle(article).then(resolve).catch(reject);
					} else {
						endURL = article;
						resolve(endURL);
					}
				} else {
						endURL = URL
						resolve(endURL);
				}
			})
			.catch(err => {
				console.error("Fetch error:", err);
				reject(err);
			});
	});
}



io.on("connection", (socket) => {
	io.emit("updateScoreBoard", {"users": finishedUsers, "times" : timeStamps})
	if (voteRunning) {
		io.emit("voteRunning", endURL)
		io.emit("updateVotingStats", {"needed": io.of("/").sockets.size , "positive" : votePositiveCounter, "negative" : voteNegativeCounter})
	}
	if (gameRunning) {
		io.emit("reconnecting", {"startURL": startURL, "endURL": endURL})
		io.emit("updateScoreBoard", {"users": finishedUsers, "times" : timeStamps, "linksClickedList" : linksClickedList})

	}
	function getNextItems() {
		voteRunning = true
		votePositiveCounter = 0
		voteNegativeCounter = 0
		hopCounter = 0
		io.emit("updateVotingStats", {"needed": io.of("/").sockets.size , "positive" : votePositiveCounter, "negative" : voteNegativeCounter})
		fetchRandomArticle()
		.then(() => {
			startURL = `${protocol}://${host}/proxy?url=` + startURL
			console.log("starting at: " + startURL)
			fetchRelatedGoalArticle(startURL)
			.then(() => {
				console.log("Goal is: " + endURL + ". Managed to achieve a Hop count of " + hopCounter)
				
				io.emit("reviewItems", endURL)
			})
		})
		.catch(err => {
			console.error("Error starting game:", err);
		});
	}
	socket.on("getNextItems", () => {
		getNextItems()
	})

	socket.on("closeGame", () => {
		gameRunning = false;
		io.emit("closeGameOnClients")
	})

	socket.on('UserFinished', (user, linksClicked) => {
		console.log(user + " has finished")
		updateScoreboardDB(user, linksClicked)
		io.emit("updateScoreBoard", {"users": finishedUsers, "times" : timeStamps, "linksClickedList" : linksClickedList})
  	}); 

	socket.on("voteUseItem", vote => {
		const needed = io.of("/").sockets.size / 2
		if (vote) {
			votePositiveCounter++
		}else{
			voteNegativeCounter++
		}
		io.emit("updateVotingStats", {"needed": io.of("/").sockets.size, "positive" : votePositiveCounter, "negative" : voteNegativeCounter})

		if (votePositiveCounter >= needed) {
			finishedUsers = []
			timeStamps = []
			linksClickedList = []
			hopCounter = 0
			votePositiveCounter = 0
			voteNegativeCounter = 0
			io.emit("starting", {"startURL": startURL, "endURL": endURL})
			startTime = Date.now();
			gameRunning = true;
			voteRunning = false;
		}else if (voteNegativeCounter > needed) {
			getNextItems()
		}
		else{
			console.log(`${votePositiveCounter} voted positive, ${needed - votePositiveCounter} more votes needed!`)
		}
	})
});

function updateScoreboardDB(user, linksClicked) {
	let alreadyFound = false
	finishedUsers.forEach(function (item, index) {
		if (item == user) {
			linksClickedList[index] = linksClicked
			const ms = Date.now() - startTime;
			timeStamps[index] = ms
			alreadyFound = true
		}
	});
	if (!alreadyFound) {
		finishedUsers.push(user)
		linksClickedList.push(linksClicked)
		const ms = Date.now() - startTime;
		timeStamps.push(ms)
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
