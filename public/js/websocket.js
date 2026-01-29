var socket = io("wikirunner.tbwebtech.de");
let room = 0
socket.on("connect", () => {});


function createLobby() {
	voting(false)
	socket.emit("createLobby", (response) => {
		room = response.room
		ScreenState("lobby", room)
		console.log("Joining room: " +  room)
	})
}

function joinLobby() {
	room = document.getElementById("roomInput").value
	console.log(room)
	socket.emit("joinLobby", room, (response) => {
		if (response.status) {
				if(response.ScreenState == "running") {
					console.log(response)
					localStorage.setItem("allreadyVoted", false)
					setupIframe(response.startURL)
					localStorage.setItem("target", response.endURL)
					gameStarted()
				}else {
					displayReview(response.endURL)
					voting(response.voting)
				}				
				document.getElementById("codeText").innerHTML = `Raumcode: ${room}`
				ScreenState(response.ScreenState, room)


		}else {
			document.getElementById("lobbyError").classList.remove("disabled")
			console.log("Unable to join")
		}
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
	voting(true)
	console.log("reviewItems")
	displayReview(endURL)
});

socket.on("voteRunning", (endURL) => {
	displayReview(endURL)	
});

socket.on("updateVotingStats",({needed, positive, negative}) => {
	console.log("updateVotingStats")
    console.log(needed + " " + positive)
	updatVotes(positive, negative, needed)
});

socket.on("closeGameOnClients", endURL => {
	ScreenState("lobby")
	voting(false)
});
socket.on("finishNotification", (user, length) => {
	console.log(`${user} finished with ${length} clicks`)
	notif = new BulmaNotification();
	notif.show(`${user} ist fertig!`, `Er brauchte ${length} Klicks`, "success", 5000);

})


function remoteFinished(linksClicked, success = true) {
	console.log("room " + room)
	socket.emit("UserFinished", room, localStorage.getItem("username"), linksClicked, success);
}


function getNextItems() {
    console.log("Get next item " + room)
	socket.emit("getNextItems", room)
}

function startGame() {
	localStorage.setItem("finished", false)
	socket.emit("startGame", room)
	return("starting Game")
}


function voteUseItem(vote) {
	voting(true, true)
	localStorage.setItem("allreadyVoted", true)
	socket.emit("voteUseItem", room, vote, localStorage.getItem("username"))
}


function closeGame() {
	socket.emit("closeGame", room)
}

