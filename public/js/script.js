let username = localStorage.getItem("username")
const wikiFrame = document.getElementById("wikiFrame")
const loginModal = document.getElementById("login")
const waitingScreen = document.getElementById("waitingScreen")
const waitingText = document.getElementById("waitingText")
const statBlock = document.getElementById("statBlock")
const targetLabel = document.getElementById("targetLabel")
const usernameText = document.getElementById("usernameText")
const previewLabel = document.getElementById("previewLabel")
const buttonLevel1 = document.getElementById("buttonLevel1")
const buttonLevel2 = document.getElementById("buttonLevel2")

localStorage.setItem("URLtoCheck", wikiFrame.src)
let linksClicked = []
let endURL = ""

function fetchPageTitle(argURL) {
    return new Promise((resolve, reject) => {
        let title = argURL.split("/");
        title = title[title.length - 1];

        const URL = "https://api.wikimedia.org/core/v1/wikipedia/de/page/" + title;

        fetch(URL)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                resolve(data.title); // Return the title when ready
            })
            .catch(err => {
                console.error("Error fetching page title:", err);
                reject(err);
            });
    });
}


function openModal($el) {
    $el.classList.add('is-active');
}

function closeModal($el) {
    username = $("#loginInput").val()
    localStorage.setItem("username", username);
    $el.classList.remove('is-active');
	ScreenState("lobby")
}

function resetUName() {
	localStorage.removeItem("username")
	openModal(loginModal)
}

function gameStarted() {
	console.log("gameStarted")
	linksClicked=[]
	localStorage.setItem("finished", false)
	endURL = localStorage.getItem("target")
	console.log("getting " + endURL)
	fetchPageTitle(endURL).then(title=> {
		targetLabel.innerHTML = "🏁  Ziel: " + "<strong>" + title  + "</strong>" + "🏁"
	})

	ScreenState("running")
}

function setupIframe(startURL) {
	wikiFrame.src = startURL
	console.log(wikiFrame.src);
}

function displayReview(endURL) {
	fetchPageTitle(endURL).then(title=> {
		previewLabel.innerHTML = `Ziel: ${title}`
		ButtonLevelStates("Level2")
	})
}
function updatVotes(positive, negative, needed) {
	const bar = document.querySelectorAll('.bar');
	bar[0].style.width = `${negative /needed * 100}%`;
	bar[1].style.width = `${positive /needed * 100}%`;

}

function ScreenState(state) {
	switch(state) {
		case "lobby":
			wikiFrame.classList.add("disabled")
			waitingScreen.classList.remove("disabled")
			targetLabel.classList.add("disabled")
			statBlock.classList.add("disabled")
			waitingText.innerHTML = `Wilkommen bei  <p class="is-funky2"> Wikirunner !</p>`
			usernameText.innerHTML= `Du bist angemeldet als <p class="is-funky">${username} </p>`
			break;
		case "running":
			targetLabel.classList.remove("disabled")
			wikiFrame.classList.remove("disabled")
			waitingScreen.classList.add("disabled")
			statBlock.classList.add("disabled")
			break;
		case "finished":
			fetchPageTitle(endURL).then(title=> {
				waitingText.innerHTML = "Glückwunsch, du bist bei " + title + " angekommen 🎉"
			})
			ButtonLevelStates("Level1")
			targetLabel.classList.remove("disabled")
			wikiFrame.classList.add("disabled")
			waitingScreen.classList.remove("disabled")
			statBlock.classList.remove("disabled")


			break;
		}
}

function ButtonLevelStates(state) {
	switch(state) {
		case "Level1":
			buttonLevel1.classList.remove("disabled")
			buttonLevel2.classList.add("disabled")
			break;
		case "Level2":
			buttonLevel1.classList.add("disabled")
			buttonLevel2.classList.remove("disabled")
			Array.from(buttonLevel2.children[2].children).forEach(element =>  {
				element.removeAttribute("disabled");
			})

			break;
		case "disabledVoteUI":
			buttonLevel1.classList.add("disabled")
			buttonLevel2.classList.remove("disabled")
			Array.from(buttonLevel2.children[2].children).forEach(element =>  {
				element.setAttribute("disabled", "disabled");
			})
	}
		
}

function displayScores(names, times, linksClickedList) {
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
			"<span class='icon'><i class='fas fa-list' aria-hidden='true'></i></span>" +
				linksClickedList[i] +
        	"</a>");
	});
}


function main() {
	ScreenState("lobby")
	ButtonLevelStates("Level1")
	if (!username) {
		console.log("uname undefined")
		openModal(loginModal)

	}

	$("#wikiFrame").on("load", function () {
		$("#wikiFrame").contents().find("a").attr('onClick', '{ localStorage.setItem("URLtoCheck", this.href)}');
	});

	window.addEventListener('storage', (event) => {
		if (event.key == "URLtoCheck") {
			let url = localStorage.getItem(event.key)
			let urlArray = url.split("/")
			fetchPageTitle(urlArray[urlArray.length -1 ]).then( title => {
				linksClicked.push(title)
			})
			if (url == localStorage.getItem("target")) {
				console.log("finished")
				localStorage.setItem("finished", true)
				ScreenState("finished")
				remoteFinished(linksClicked)
			}
		}
	});
}

main()
