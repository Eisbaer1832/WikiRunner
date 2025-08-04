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
const roomSelect = document.getElementById("roomSelect")
const exitBtn = document.getElementById("exitBtn")
rememberedRoom = 0
localStorage.setItem("URLtoCheck", wikiFrame.src)
let linksClicked = []
let endURL = ""

$(document).ready(function() {
  $(".navbar-burger").click(function() {
      $(".navbar-burger").toggleClass("is-active");
      $(".navbar-menu").toggleClass("is-active");
  });
});


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
	ScreenState("roomSelect")
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
	
	fetchPageTitle(startURL).then(title => {
		linksClicked.push(title)
	})
	
	console.log(wikiFrame.src);
}

function displayReview(endURL) {
	fetchPageTitle(endURL).then(title=> {
		previewLabel.innerHTML = `Ziel: <p class="is-funky2">${title}</p>`
		voting(true)
	})
}
function updatVotes(positive, negative, needed) {
	const voteIndicator = document.getElementById("voteIndicator");
	voteIndicator.innerHTML = positive + "/" + needed

}

function ScreenState(state, room = "???") {
	switch(state) {
		case "roomSelect":
			wikiFrame.classList.add("disabled")
			waitingScreen.classList.add("disabled")
			targetLabel.classList.add("disabled")
			statBlock.classList.add("disabled")
			roomSelect.classList.remove("disabled")
			usernameText.innerHTML= `Nutzername: ${username}`
			break;

		case "lobby":
			rememberedRoom = room
			wikiFrame.classList.add("disabled")
			waitingScreen.classList.remove("disabled")
			targetLabel.classList.add("disabled")
			statBlock.classList.add("disabled")
			roomSelect.classList.add("disabled")
			console.log("lobby" + room)
			waitingText.innerHTML = `Raumcode: ${room}`
			usernameText.innerHTML= `Nutzername: ${username}`
			exitBtn.onclick = function(){ScreenState("roomSelect")}; 
			console.log(exitBtn)

			break;
		case "running":
			targetLabel.classList.remove("disabled")
			wikiFrame.classList.remove("disabled")
			waitingScreen.classList.add("disabled")
			statBlock.classList.add("disabled")
			roomSelect.classList.add("disabled")
			exitBtn.onclick = function(){remoteFinished(linksClicked, false); ScreenState("finished")}; 
			break;
		case "finished":
			fetchPageTitle(endURL).then(title=> {
				waitingText.innerHTML = "Glückwunsch, du bist bei " + title + " angekommen 🎉"
			})
			voting(false)
			targetLabel.classList.remove("disabled")
			wikiFrame.classList.add("disabled")
			waitingScreen.classList.remove("disabled")
			statBlock.classList.remove("disabled")
			roomSelect.classList.add("disabled")
			exitBtn.onclick = function(){ScreenState("lobby", rememberedRoom)}; 
			break;
		}
}

function voting(state) {
	switch(state) {
		case false:
			buttonLevel1.classList.remove("disabled")
			buttonLevel2.classList.add("disabled")
			break;
		case true:
			buttonLevel1.classList.add("disabled")
			buttonLevel2.classList.remove("disabled")
			break;
	}
		
}

function displayScores(names, times, linksClickedList) {
	document.getElementById("statsInsert").innerHTML = ""
	names.forEach((name, i) => {
		$('#statsInsert').append("" +
			"<a class='panel-block is-active'> " +
    		"<span class='icon'><i class='fas fa-clock' aria-hidden='true'></i></span>" +
				times[i] + " Sekunden" + 
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
	ScreenState("roomSelect")
	voting(false)
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
				if (title != linksClicked[linksClicked.length - 1]) {
					linksClicked.push(title)
				}
			})
			if (url == localStorage.getItem("target")) {
				console.log("finished")
				console.log(url)
				fetchPageTitle(url).then(title => {
					if (title != linksClicked[linksClicked.length - 1]) {
						linksClicked.push(title)
					}
					console.log(linksClicked)
					remoteFinished(linksClicked)
					localStorage.setItem("finished", true)
					ScreenState("finished")
				})
		
			}
		}
	});
}

main()
