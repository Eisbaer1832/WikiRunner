var socket = io("127.0.0.1:9877");

socket.on("connect", () => {});

socket.on("starting", ({startURL, endURL}) => {
	if (localStorage.getItem("finished") == "true") {
		console.log("allready finished")
		localFinished()
	}else{
		console.log(startURL)
		setupIframe(startURL)

		localStorage.setItem("target", endURL)
		gameStarted()
	}
	fetchPageTitle(endURL)
});


socket.on("updateScoreBoard", ({users, times, linksClickedList}) => {
	displayScores(users, times, linksClickedList)
});

function remoteFinished(linksClicked) {
  socket.emit("UserFinished", localStorage.getItem("username"), linksClicked);
}


function startGame() {
	localStorage.setItem("finished", false)
	socket.emit("startGame")
	return("starting Game")
}
