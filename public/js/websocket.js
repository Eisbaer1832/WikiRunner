var socket = io("wikirunner.tbwebtech.de");

socket.on("connect", () => {});

socket.on("starting", ({startURL, endURL}) => {
	localStorage.setItem("allreadyVoted", false)
	setupIframe(startURL)
	localStorage.setItem("target", endURL)
	gameStarted()
});


socket.on("reconnecting", ({startURL, endURL}) => {
	if (localStorage.getItem("finished") == "true") {
		console.log("allready finished")
		ScreenState("finished")
	}else{
		setupIframe(startURL)
		localStorage.setItem("target", endURL)
		gameStarted()
	}
});


socket.on("updateScoreBoard", ({users, times, linksClickedList}) => {
	displayScores(users, times, linksClickedList)
});

socket.on("reviewItems", endURL => {
	localStorage.setItem("allreadyVoted", false)
	ButtonLevelStates("Level2")
	console.log("reviewItems")
	displayReview(endURL)
});

socket.on("voteRunning", (endURL) => {
	displayReview(endURL)	
});

socket.on("updateVotingStats",({needed, positive, negative}) => {
	console.log("updateVotingStats")
	updatVotes(positive, negative, needed)
});

socket.on("closeGameOnClients", endURL => {
	ScreenState("lobby")
	ButtonLevelStates("Level1")
});

function remoteFinished(linksClicked) {
  socket.emit("UserFinished", localStorage.getItem("username"), linksClicked);
}


function getNextItems() {
	socket.emit("getNextItems")
}

function startGame() {
	localStorage.setItem("finished", false)
	socket.emit("startGame")
	return("starting Game")
}


function voteUseItem(vote) {
	ButtonLevelStates("disabledVoteUI")
	localStorage.setItem("allreadyVoted", true)
	socket.emit("voteUseItem", vote, localStorage.getItem("username"))
}


function closeGame() {
	socket.emit("closeGame")
}
