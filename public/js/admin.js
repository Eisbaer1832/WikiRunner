const targetFullP = document.getElementById("targetFull")

function updateAdmin() {
	targetFullP.innerHTML = localStorage.getItem("target")
}
