window.onload = function() {
	var d = document.querySelector(".card.map");
	if(d) d.style.minHeight = d.offsetWidth*0.66 + "px";
	d.style.background = "url('http://maps.googleapis.com/maps/api/staticmap?center=" +
		d.dataset.lat + 
		"," + 
		d.dataset.long + 
		"&zoom=14&size=" + 
		d.offsetWidth + 
		"x" + 
		d.offsetHeight + 
		"&sensor=false') center center no-repeat";
	d.innerHTML = "";
}