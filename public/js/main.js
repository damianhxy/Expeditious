window.onload = function() {
	
	d = document.querySelector(".card.map");
	d.style.minHeight = d.offsetWidth*0.66 + "px";
	
	function locate(){
		d.style.background = "#555";
		d.innerHTML = "<i class='fa fa-cog fa-spin'></i>";
		if(navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(showPosition, showError);
		}
		else {
			d.innerHTML = "<i class='fa fa-warning'></i> GPS Unsupported";
			d.style.background = "rgba(192, 57, 43, 1.0)";
		}
	}
	
	function showPosition(position) {
		d.style.background = "url('http://maps.googleapis.com/maps/api/staticmap?center=" + position.coords.latitude + "," + position.coords.longitude + "&zoom=14&size=" + d.offsetWidth + "x" + d.offsetHeight + "&sensor=false') center center no-repeat";
		d.innerHTML = "";
	}
	
	function showError(error) {
		d.style.background = "rgba(192, 57, 43, 1.0)";
		switch(error.code) {
			case error.PERMISSION_DENIED:
				d.innerHTML = "<i class='fa fa-warning'></i> User denied the request for Geolocation."
				break;
			case error.POSITION_UNAVAILABLE:
				d.innerHTML = "<i class='fa fa-warning'></i> Location information is unavailable."
				break;
			case error.TIMEOUT:
				d.innerHTML = "<i class='fa fa-warning'></i> The request to get user location timed out."
				break;
			case error.UNKNOWN_ERROR:
				d.innerHTML = "<i class='fa fa-warning'></i> An unknown error occurred."
				break;
		}
	}
	
	locate();
	
	d.onclick = function() {
		locate();
	}
}