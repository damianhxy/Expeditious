"use strict";

const map = document.querySelector(".card.map");
if (map) {
  map.style.minHeight = map.offsetWidth * 0.66 + "px";
  map.style.background =
    "url('https://maps.googleapis.com/maps/api/staticmap?center=" +
    map.dataset.lat +
    "," +
    map.dataset.long +
    "&zoom=18&size=" +
    map.offsetWidth +
    "x" +
    Math.round(map.offsetWidth * 0.66) +
    "&sensor=false') center center no-repeat";
  map.innerHTML = "";
}
