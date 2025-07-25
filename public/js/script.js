let username = localStorage.getItem("username")
const wikiFrame = document.getElementById("wikiFrame")
const loginModal = document.getElementById("login")
const waitingScreen = document.getElementById("waitingScreen")
const waitingText = document.getElementById("waitingText")
const statBlock = document.getElementById("statBlock")
const targetLabel = document.getElementById("targetLabel")
localStorage.removeItem("URLtoCheck")
const goalText = localStorage.getItem("target").split('/');


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
	localStorage.setItem("finished", false)
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
	waitingText.innerHTML = "Glückwunsch, du bist bei " + goalText[goalText.length - 1] + " angekommen 🎉"
	statBlock.classList.remove("disabled")
}

function displayScores(names, times) {
	console.log(names)
	document.getElementById("statsInsert").innerHTML = ""
	names.forEach((name, i) => {
		$('#statsInsert').append("" +
			"<a class='panel-block is-active'> " +
    		"<span class='icon'><i class='fas fa-clock' aria-hidden='true'></i></span>" +
				times[i] / 1000 + " Sekunden" + 
				" - " +
    		"<span class='icon'><i class='fas fa-user' aria-hidden='true'></i></span>" +

            	name  +
        	"</a>");
	});
}

function main() {
	wikiFrame.classList.add("disabled")
	statBlock.classList.add("disabled")
	targetLabel.innerHTML = "🏁" + "<strong>" + goalText[goalText.length - 1]  + "</strong>" + "🏁"

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