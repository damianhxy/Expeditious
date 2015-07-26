window.onload = function() {

	var d = document.querySelector(".card.map");
	if(d) d.style.minHeight = d.offsetWidth*0.66 + "px";
	var lat, long;
	var locationTypes = [
		"airport",
		"amusement_park",
		"aquarium",
		"art_gallery",
		"casino",
		"church",
		"hindu_temple",
		"hospital",
		"library",
		"mosque",
		"museum",
		"park",
		"shopping_mall",
		"stadium",
		"synagogue",
		"school",
		"university",
		"zoo"
	];

	function type(arr) {
		var a = 0, l;
		for(; a < arr.length && ! ~ locationTypes.indexOf(arr[a]); a++);
		switch(arr[a]) {
			case "airport":
				l = "plane";
				break;
			case "amusement_park":
				l = "space-shuttle";
				break;
			case "aquarium":
				l = "anchor";
				break;
			case "art_gallery":
				l = "paint-brush";
				break;
			case "casino":
				l = "money";
				break;
			case "hospital":
				l = "ambulance";
				break;
			case "library":
				l = "book";
				break;
			case "museum":
				l = "institution";
				break;
			case "park":
				l = "tree";
				break;
			case "shopping_mall":
				l = "building";
				break;
			case "stadium":
				l = "soccer-ball-o";
				break;
			case "school":
			case "university":
				l = "graduation-cap";
				break;
			case "zoo":
				l = "paw";
				break;
			case "mosque":
				l = "moon-o";
				break;
			case "church":
			case "hindu_temple":
			case "synagogue":
				l = "group";
				break;
		}

		console.log(l);
		return l;
	}

	function rad(x){
		return x*Math.PI/180;
	}

	function distance(lat1, long1, lat2, long2){
		console.log(lat1,long1,lat2,long2);
		var R = 6384469;
		var dLat = rad(lat2-lat1);
		var dLong = rad(long2-long1);
		var a = Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLong/2)*Math.sin(dLong/2);
		var c  = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
		var d = R * c;
		return Math.ceil(d/10)*10;
	}

	function locate() {
		d.style.background = "#555";
		d.innerHTML = "<i class='fa fa-cog fa-spin'></i>";
		if(navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(showPosition, showError);
		}
		else {
			d.innerHTML = "<i class='fa fa-frown-o'></i> GPS Unsupported";
			d.style.background = "rgba(192, 57, 43, 1.0)";
		}
		if(document.body.dataset.user){
			var x = new XMLHttpRequest();
			x.onreadystatechange=function(){
				if (x.readyState==4 && x.status==200){
					var n = JSON.parse(x.responseText);
					/*c = document.createDocumentFragment();
					n.forEach(function(e){

					});*/
					console.log(n);
				}
			};
			x.open("POST","/users/activity",true);
			x.send();
		}
	}

	function showPosition(position) {
		lat = position.coords.latitude;
		long = position.coords.longitude;
		d.style.background = "url('http://maps.googleapis.com/maps/api/staticmap?center=" + lat + "," + long + "&zoom=14&size=" + d.offsetWidth + "x" + d.offsetHeight + "&sensor=false') center center no-repeat";
		d.innerHTML = "";
		if(lat&&long){
			// Nearby Areas
			var x = new XMLHttpRequest();
			x.onreadystatechange = function(){
				if (x.readyState===4 && x.status===200){
					document.querySelectorAll(".card .nearby")[0].innerHTML = '';
					var n = JSON.parse(x.responseText);
					n.results = n.results.slice(0,5);
					n.results.forEach(function(e){
						var y = document.createElement('div');
						y.innerHTML = '<a href="/locations/'
							+ e.place_id
							+ '"><section class="place"> <section class="icon"> <i class="fa fa-'
							+ type(e.types)
							+ '"></i> </section> <section class="main"> <section class="left"> <p>'
							+ e.name
							+'</p> </section> <section class="right">'
							+ distance(lat, long, e.geometry.location.lat, e.geometry.location.lng)
							+ 'm</section> </section></a>';
						document.querySelectorAll(".card .nearby")[0].appendChild(y);
					});
				}
			};
			x.open("POST","/locations/nearby",true);
			x.setRequestHeader("Content-type","application/x-www-form-urlencoded");
			x.send("lat="+lat+"&long="+long);
			document.querySelectorAll(".card .nearby")[0].innerHTML = '<i class="fa fa-cog fa-spin"></i>';

			// Nearby Carparks
            var u = new XMLHttpRequest();
			u.onreadystatechange = function(){
				console.log(u.readyState);
				console.log(u.status);
				if (u.readyState===4 && u.status===200) {
					document.querySelectorAll(".card .nearby")[1].innerHTML = "";
					var n = JSON.parse(u.responseText);
					n.d = n.d.slice(0, 5);
					n.d.forEach(function(e) {
						var y = document.createElement("div");
						y.innerHTML = '<a href="/locations/'
							+ e.CarParkID
							+ '"><section class="place"> <section class="icon"> <i class="fa fa-car"></i> </section> <section class="main"> <section class="left"> <p>'
							+ e.Development
							+'</p> </section> <section class="right">'
							+ "("+ e.Lots + " lots) "
							+ distance(lat, long, e.Latitude, e.Longitude)
							+ 'm</section> </section></a>';
						document.querySelectorAll(".card .nearby")[1].appendChild(y);
					});
				}
			};
			u.open("POST","/locations/nearbyCarparks",true);
			u.setRequestHeader("Content-type","application/x-www-form-urlencoded");
			u.send("lat="+lat+"&long="+long);
			document.querySelectorAll(".card .nearby")[1].innerHTML = '<i class="fa fa-cog fa-spin"></i>';
		}
	}

	function showError(error) {
		d.style.background = "rgba(192, 57, 43, 1.0)";
		switch(error.code) {
			case error.PERMISSION_DENIED:
				d.innerHTML = "<i class='fa fa-frown-o'></i> User denied the request for Geolocation.";
				break;
			case error.POSITION_UNAVAILABLE:
				d.innerHTML = "<i class='fa fa-frown-o'></i> Location information is unavailable.";
				break;
			case error.TIMEOUT:
				d.innerHTML = "<i class='fa fa-frown-o'></i> The request to get user location timed out.";
				break;
			case error.UNKNOWN_ERROR:
				d.innerHTML = "<i class='fa fa-frown-o'></i> An unknown error occurred.";
				break;
		}
	}

	if(d) locate();

	document.querySelector('.floatbutton').onclick = function() {
		locate();
	};
};