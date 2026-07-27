"use strict";

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : "";
}

function postAjax(url, data, callback) {
  const x = new XMLHttpRequest();
  x.onreadystatechange = function () {
    if (x.readyState === 4 && x.status === 200) callback(JSON.parse(x.responseText));
  };
  x.open("POST", url, true);
  x.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  x.setRequestHeader("X-CSRF-Token", getCsrfToken());
  x.send(data);
}

window.onload = function () {
  const d = document.querySelector(".card.map");
  if (d) d.style.minHeight = d.offsetWidth * 0.66 + "px";
  let lat, long;
  const locationTypes = [
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
    "place_of_worship",
    "point_of_interest",
    "shopping_mall",
    "stadium",
    "synagogue",
    "school",
    "subway_station",
    "university",
    "zoo",
  ];

  function type(arr) {
    let a = 0;
    let l = "map-marker";
    for (; a < arr.length && locationTypes.indexOf(arr[a]) === -1; a++);
    if (a >= arr.length) return l;
    switch (arr[a]) {
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
      case "place_of_worship":
        l = "group";
        break;
      case "subway_station":
        l = "train";
        break;
    }
    return l;
  }

  function rad(x) {
    return (x * Math.PI) / 180;
  }

  function distance(lat1, long1, lat2, long2) {
    const R = 6384469;
    const dLat = rad(lat2 - lat1);
    const dLong = rad(long2 - long1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLong / 2) * Math.sin(dLong / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.ceil((R * c) / 10) * 10;
  }

  function locate() {
    d.style.background = "#555";
    d.innerHTML = "<i class='fa fa-cog fa-spin'></i>";
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
      d.innerHTML = "<i class='fa fa-frown-o'></i> GPS Unsupported";
      d.style.background = "rgba(192, 57, 43, 1.0)";
    }
  }

  function showPosition(position) {
    lat = position.coords.latitude;
    long = position.coords.longitude;
    d.style.background =
      "url('https://maps.googleapis.com/maps/api/staticmap?center=" +
      lat +
      "," +
      long +
      "&zoom=14&size=" +
      d.offsetWidth +
      "x" +
      Math.round(d.offsetWidth * 0.66) +
      "&sensor=false') center center no-repeat";
    d.innerHTML = "";
    if (lat && long) {
      document.querySelectorAll(".card .nearby")[0].innerHTML = '<i class="fa fa-cog fa-spin"></i>';
      postAjax(
        "/locations/nearby",
        "lat=" +
          lat +
          "&long=" +
          function (n) {
            document.querySelectorAll(".card .nearby")[0].innerHTML = "";
            n.results = n.results.slice(0, 5);
            n.results.forEach(function (e) {
              const y = document.createElement("div");
              y.innerHTML =
                '<a href="/locations/' +
                escapeHtml(e.place_id) +
                '"><section class="place"> <section class="icon"> <i class="fa fa-' +
                escapeHtml(type(e.types)) +
                '"></i> </section> <section class="main"> <section class="left"> <p>' +
                escapeHtml(e.name) +
                '</p> </section> <section class="right">' +
                distance(lat, long, e.geometry.location.lat, e.geometry.location.lng) +
                "m</section> </section></a>";
              document.querySelectorAll(".card .nearby")[0].appendChild(y);
            });
          },
      );

      document.querySelectorAll(".card .nearby")[1].innerHTML = '<i class="fa fa-cog fa-spin"></i>';
      postAjax("/locations/nearbyCarparks", "lat=" + lat + "&long=" + long, function (n) {
        document.querySelectorAll(".card .nearby")[1].innerHTML = "";
        n.d = n.d.slice(0, 5);
        n.d.forEach(function (e) {
          const y = document.createElement("div");
          y.innerHTML =
            '<section class="place"> <section class="icon"> <i class="fa fa-car"></i> </section> <section class="main"> <section class="left"> <p>' +
            escapeHtml(e.Development) +
            '</p> </section> <section class="right">(' +
            escapeHtml(String(e.Lots)) +
            " lots) " +
            distance(lat, long, e.Latitude, e.Longitude) +
            "m</section> </section>";
          document.querySelectorAll(".card .nearby")[1].appendChild(y);
        });
      });
    }
  }

  function showError(error) {
    d.style.background = "rgba(192, 57, 43, 1.0)";
    switch (error.code) {
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

  if (d) locate();

  const floatBtn = document.querySelector(".floatbutton");
  if (floatBtn) {
    floatBtn.onclick = function () {
      if (d) locate();
    };
  }
};
