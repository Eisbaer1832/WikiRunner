let target = "http://127.0.0.1:9876/proxy?url=https://de.wikipedia.org/wiki/Baracke"
localStorage.clear()
wikiFrame = document.getElementById("wikiFrame")

url = wikiFrame.src


$("#wikiFrame").on("load", function () {
	$("#wikiFrame").contents().find("a").attr('onClick', '{ localStorage.setItem("blub", this.href)}');
});


window.addEventListener('storage', (event) => {
	if (localStorage.getItem(event.key) == target) {
    	console.log("finished")
    }
});