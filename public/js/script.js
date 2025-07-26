let username = localStorage.getItem("username")
const wikiFrame = document.getElementById("wikiFrame")
const loginModal = document.getElementById("login")
const waitingScreen = document.getElementById("waitingScreen")
const waitingText = document.getElementById("waitingText")
const statBlock = document.getElementById("statBlock")
const targetLabel = document.getElementById("targetLabel")
localStorage.setItem("URLtoCheck", wikiFrame.src)

const goalText = localStorage.getItem("target").split('/');
let linksClicked = []
function fetchPageTitle(argURL) {
	let title = argURL.split("/")
	title = title[title.length -1]

		const URL = "https://api.wikimedia.org/core/v1/wikipedia/de/page/" + title
		fetch(URL)
			.then(response => {
				if (!response.ok) {
				throw new Error('Network response was not ok');
				}
				return response.json();
			})
			.then(data => {
				title = data.title
				document.getElementById("targetLabel").innerHTML = "🏁" + "<strong>" + title  + "</strong>" + "🏁"
				waitingText.innerHTML = "Glückwunsch, du bist bei " + title + " angekommen 🎉"

			})
			.catch(err => {
				console.error("Error fetching random article:", err);
			});
}


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
	console.log("gameStarted")
	localStorage.setItem("finished", false)
	wikiFrame.classList.remove("disabled")
	waitingScreen.classList.add("disabled")
}

function setupIframe(startURL) {
	wikiFrame.src = startURL
	console.log(wikiFrame.src);
}

function localFinished() {
	wikiFrame.classList.add("disabled")
	waitingScreen.classList.remove("disabled")
	statBlock.classList.remove("disabled")
}

function displayScores(names, times, linksClickedList) {
	console.log(linksClickedList)
	document.getElementById("statsInsert").innerHTML = ""
	names.forEach((name, i) => {
		$('#statsInsert').append("" +
			"<a class='panel-block is-active'> " +
    		"<span class='icon'><i class='fas fa-clock' aria-hidden='true'></i></span>" +
				times[i] / 1000 + " Sekunden" + 
				" - " +
    		"<span class='icon'><i class='fas fa-user' aria-hidden='true'></i></span>" +
            	name  +
			"<br>" +
			"<span class='icon'><i class='fas fa-user' aria-hidden='true'></i></span>" +
				linksClickedList +
        	"</a>");
	});
}


function main() {
	wikiFrame.classList.add("disabled")
	statBlock.classList.add("disabled")

	if (!username) {
		console.log("uname undefined")
		openModal(loginModal)

	}

	$("#wikiFrame").on("load", function () {
		$("#wikiFrame").contents().find("a").attr('onClick', '{ localStorage.setItem("URLtoCheck", this.href)}');
	});

	window.addEventListener('storage', (event) => {
		if (event.key == "URLtoCheck" ) {
			let url = localStorage.getItem(event.key)
			let urlArray = url.split("/")
			linksClicked.push(urlArray[urlArray.length -1 ])
			if (url == localStorage.getItem("target")) {
				console.log("finished")
				localStorage.setItem("finished", true)
				localFinished()
				remoteFinished(linksClicked)
			}
		}
	});
}

main()
