var socket = io("127.0.0.1:9877");
let room = 0
socket.on("connect", () => {});


function createLobby() {
	ScreenState("lobby")
	ButtonLevelStates("Level1")
	socket.emit("createLobby", (response) => {
		room = response.room
		console.log("Joining room: " +  room)
	})
}



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
  socket.emit("UserFinished", room, localStorage.getItem("username"), linksClicked);
}


function getNextItems() {
	socket.emit("getNextItems", room)
}

function startGame() {
	localStorage.setItem("finished", false)
	socket.emit("startGame", room)
	return("starting Game")
}


function voteUseItem(vote) {
	ButtonLevelStates("disabledVoteUI")
	localStorage.setItem("allreadyVoted", true)
	socket.emit("voteUseItem", room, vote, localStorage.getItem("username"))
}


function closeGame() {
	socket.emit("closeGame")
}

