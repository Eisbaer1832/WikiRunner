var socket = io("127.0.0.1:9877");

socket.on("connect", () => {
  console.log(socket.id); 
});


socket.on("starting", ({startURL, endURL}) => {
	if (localStorage.getItem("finished") == "true") {
		console.log("allready finished")
		localFinished()
	}else{
		console.log(startURL)
		setupIframe(startURL)

		localStorage.setItem("target", endURL)
		const goalText = endURL.split("/")
		document.getElementById("targetLabel").innerHTML = "🏁" + "<strong>" + goalText[goalText.length - 1]  + "</strong>" + "🏁"
		gameStarted()
	}
});


socket.on("updateScoreBoard", ({users, times}) => {
	displayScores(users, times)
});

function remoteFinished() {
  socket.emit("UserFinished", localStorage.getItem("username"));
}


function startGame() {
	localStorage.setItem("finished", false)
	socket.emit("startGame")
}