var socket = io("127.0.0.1:9877");

socket.on("connect", () => {});

socket.on("starting", ({startURL, endURL}) => {
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
	displayReview(endURL)
});

socket.on("voteRunning", endURL => {
	displayReview(endURL)
	ButtonLevelStates("Level2")
});


socket.on("updateVotingStats",({needed, positive, negative}) => {
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
	socket.emit("voteUseItem", vote)
}


function closeGame() {
	socket.emit("closeGame")
}
