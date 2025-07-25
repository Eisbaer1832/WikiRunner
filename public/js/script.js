let username = localStorage.getItem("username")
const wikiFrame = document.getElementById("wikiFrame")
const loginModal = document.getElementById("login")
const waitingScreen = document.getElementById("waitingScreen")
const waitingText = document.getElementById("waitingText")
const statBlock = document.getElementById("statBlock")
localStorage.removeItem("URLtoCheck")


function openModal($el) {
    $el.classList.add('is-active');
}

function closeModal($el) {
    username = $("#loginInput").val()
    localStorage.setItem("username", username);
    $el.classList.remove('is-active');
    
}

function resetUName() {
	localStorage.removeItem("username")
	openModal(loginModal)
}

function gameStarted() {
	wikiFrame.classList.remove("disabled")
	waitingScreen.classList.add("disabled")
}

function setupIframe(startURL) {
	wikiFrame.src = startURL
	console.log(wikiFrame.src)
}

function localFinished() {
	wikiFrame.classList.add("disabled")
	waitingScreen.classList.remove("disabled")
	waitingText.innerHTML = "Glückwunsch, du bist auf der Zielseite angekommen 🎉"
	statBlock.classList.remove("disabled")

}

function main() {
	wikiFrame.classList.add("disabled")
	statBlock.classList.add("disabled")
	if (!username) {
		console.log("uname undefined")
		openModal(loginModal)

	}


	url = wikiFrame.src


	$("#wikiFrame").on("load", function () {
		$("#wikiFrame").contents().find("a").attr('onClick', '{ localStorage.setItem("URLtoCheck", this.href)}');
	});


	window.addEventListener('storage', (event) => {
		if (localStorage.getItem(event.key) == localStorage.getItem("target"), event.key == "URLtoCheck") {
			console.log("finished")
			localStorage.setItem("finished", true)
			localFinished()
			remoteFinished()
		}
	});
}

main()