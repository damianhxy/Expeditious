var Q = require("q");
var nedb = require("nedb");
var http = require("http");
var settings = require("../controllers/settings.js");
// image
// description
/*
    Carparks (HDB)
    name: name
    latitude: float
    longtitude: float
*/
function getRequest(options) {
    return Q.promise(function(resolve, reject, notify) {
        var callback = function(res) {
            var response = "";
            res.on("data", function(chunk) {
                response += chunk;
            });
            res.on("end", function() {
                resolve(response);
            });
        }
        http.request(options, callback).end();
    });
}

exports.getPlace = function(id) {
    return Q.promise(function(resolve, reject, notify) {
        var host = "maps.googleapis.com";
        var path = "/maps/api/place/details/json?";
        path += "key=" + settings.API_KEY;
        path += "&placeid" + id;
        getRequest({
            host: host,
            path: path
        })
        .then(function(res) {
            resolve(JSON.parse(res));
        })
        .fail(function(err) {
            reject(err);
        });
    });
};

/*
   "html_attributions" : [],
   "result" : {
      "address_components" : [
         {
            "long_name" : "48",
            "short_name" : "48",
            "types" : [ "street_number" ]
         },
         {
            "long_name" : "Pirrama Road",
            "short_name" : "Pirrama Road",
            "types" : [ "route" ]
         },
         {
            "long_name" : "Pyrmont",
            "short_name" : "Pyrmont",
            "types" : [ "locality", "political" ]
         },
         {
            "long_name" : "NSW",
            "short_name" : "NSW",
            "types" : [ "administrative_area_level_1", "political" ]
         },
         {
            "long_name" : "AU",
            "short_name" : "AU",
            "types" : [ "country", "political" ]
         },
         {
            "long_name" : "2009",
            "short_name" : "2009",
            "types" : [ "postal_code" ]
         }
      ],
      "formatted_address" : "48 Pirrama Road, Pyrmont NSW, Australia",
      "formatted_phone_number" : "(02) 9374 4000",
      "geometry" : {
         "location" : {
           "lat" : -33.8669710,
           "lng" : 151.1958750
         }
      },
      "icon" : "http://maps.gstatic.com/mapfiles/place_api/icons/generic_business-71.png",
      "id" : "4f89212bf76dde31f092cfc14d7506555d85b5c7",
      "international_phone_number" : "+61 2 9374 4000",
      "name" : "Google Sydney",
      "place_id" : "ChIJN1t_tDeuEmsRUsoyG83frY4",
      "scope" : "GOOGLE",
      "alt_ids" : [
         {
            "place_id" : "D9iJyWEHuEmuEmsRm9hTkapTCrk",
            "scope" : "APP"
         }
      ],
      "rating" : 4.70,
      "reference" : "CnRsAAAA98C4wD-VFvzGq-KHVEFhlHuy1TD1W6UYZw7KjuvfVsKMRZkbCVBVDxXFOOCM108n9PuJMJxeAxix3WB6B16c1p2bY1ZQyOrcu1d9247xQhUmPgYjN37JMo5QBsWipTsnoIZA9yAzA-0pnxFM6yAcDhIQbU0z05f3xD3m9NQnhEDjvBoUw-BdcocVpXzKFcnMXUpf-nkyF1w",
      "reviews" : [
         {
            "aspects" : [
               {
                  "rating" : 3,
                  "type" : "quality"
               }
            ],
            "author_name" : "Simon Bengtsson",
            "author_url" : "https://plus.google.com/104675092887960962573",
            "language" : "en",
            "rating" : 5,
            "text" : "Just went inside to have a look at Google. Amazing.",
            "time" : 1338440552869
         },
         {
           "aspects" : [
              {
                 "rating" : 3,
                 "type" : "quality"
              }
             ],
            "author_name" : "Felix Rauch Valenti",
            "author_url" : "https://plus.google.com/103291556674373289857",
            "language" : "en",
            "rating" : 5,
            "text" : "Best place to work :-)",
            "time" : 1338411244325
         },
         {
           "aspects" : [
              {
                 "rating" : 3,
                 "type" : "quality"
              }
             ],
            "author_name" : "Chris",
            "language" : "en",
            "rating" : 5,
            "text" : "Great place to work, always lots of free food!",
            "time" : 1330467089039
         }
      ],
      "types" : [ "establishment" ],
      "url" : "http://maps.google.com/maps/place?cid=10281119596374313554",
      "vicinity" : "48 Pirrama Road, Pyrmont",
      "website" : "http://www.google.com.au/"
   },
   "status" : "OK"
}
*/

exports.findNearby = function(lat, long, user) {
    return Q.promise(function(resolve, reject, notify) {
        var host = "maps.googleapis.com";
        var path = "/maps/api/place/nearbysearch/json?";
        path += "key=" + settings.API_KEY;
        path += "&location=" + lat + "," + long;
        path += "&radius=" + user.preferences.radius;
        getRequest({
            host: host,
            path: path
        })
        .then(function(res) {
            resolve(JSON.parse(res));
        })
        .fail(function(err) {
            reject(err);
        });
    });
};

/*
{
   "html_attributions" : [],
   "results" : [
      {
         "geometry" : {
            "location" : {
               "lat" : -33.870775,
               "lng" : 151.199025
            }
         },
         "icon" : "http://maps.gstatic.com/mapfiles/place_api/icons/travel_agent-71.png",
         "id" : "21a0b251c9b8392186142c798263e289fe45b4aa",
         "name" : "Rhythmboat Cruises",
         "opening_hours" : {
            "open_now" : true
         },
         "photos" : [
            {
               "height" : 270,
               "html_attributions" : [],
               "photo_reference" : "CnRnAAAAF-LjFR1ZV93eawe1cU_3QNMCNmaGkowY7CnOf-kcNmPhNnPEG9W979jOuJJ1sGr75rhD5hqKzjD8vbMbSsRnq_Ni3ZIGfY6hKWmsOf3qHKJInkm4h55lzvLAXJVc-Rr4kI9O1tmIblblUpg2oqoq8RIQRMQJhFsTr5s9haxQ07EQHxoUO0ICubVFGYfJiMUPor1GnIWb5i8",
               "width" : 519
            }
         ],
         "place_id" : "ChIJyWEHuEmuEmsRm9hTkapTCrk",
         "scope" : "GOOGLE",
         "alt_ids" : [
            {
               "place_id" : "D9iJyWEHuEmuEmsRm9hTkapTCrk",
               "scope" : "APP"
            }
         ],
         "reference" : "CoQBdQAAAFSiijw5-cAV68xdf2O18pKIZ0seJh03u9h9wk_lEdG-cP1dWvp_QGS4SNCBMk_fB06YRsfMrNkINtPez22p5lRIlj5ty_HmcNwcl6GZXbD2RdXsVfLYlQwnZQcnu7ihkjZp_2gk1-fWXql3GQ8-1BEGwgCxG-eaSnIJIBPuIpihEhAY1WYdxPvOWsPnb2-nGb6QGhTipN0lgaLpQTnkcMeAIEvCsSa0Ww",
         "types" : [ "travel_agency", "restaurant", "food", "establishment" ],
         "vicinity" : "Pyrmont Bay Wharf Darling Dr, Sydney"
      },
      {
         "geometry" : {
            "location" : {
               "lat" : -33.866891,
               "lng" : 151.200814
            }
         },
         "icon" : "http://maps.gstatic.com/mapfiles/place_api/icons/restaurant-71.png",
         "id" : "45a27fd8d56c56dc62afc9b49e1d850440d5c403",
         "name" : "Private Charter Sydney Habour Cruise",
         "photos" : [
            {
               "height" : 426,
               "html_attributions" : [],
               "photo_reference" : "CnRnAAAAL3n0Zu3U6fseyPl8URGKD49aGB2Wka7CKDZfamoGX2ZTLMBYgTUshjr-MXc0_O2BbvlUAZWtQTBHUVZ-5Sxb1-P-VX2Fx0sZF87q-9vUt19VDwQQmAX_mjQe7UWmU5lJGCOXSgxp2fu1b5VR_PF31RIQTKZLfqm8TA1eynnN4M1XShoU8adzJCcOWK0er14h8SqOIDZctvU",
               "width" : 640
            }
         ],
         "place_id" : "ChIJqwS6fjiuEmsRJAMiOY9MSms",
         "scope" : "GOOGLE",
         "reference" : "CpQBhgAAAFN27qR_t5oSDKPUzjQIeQa3lrRpFTm5alW3ZYbMFm8k10ETbISfK9S1nwcJVfrP-bjra7NSPuhaRulxoonSPQklDyB-xGvcJncq6qDXIUQ3hlI-bx4AxYckAOX74LkupHq7bcaREgrSBE-U6GbA1C3U7I-HnweO4IPtztSEcgW09y03v1hgHzL8xSDElmkQtRIQzLbyBfj3e0FhJzABXjM2QBoUE2EnL-DzWrzpgmMEulUBLGrtu2Y",
         "types" : [ "restaurant", "food", "establishment" ],
         "vicinity" : "Australia"
      },
      {
         "geometry" : {
            "location" : {
               "lat" : -33.870943,
               "lng" : 151.190311
            }
         },
         "icon" : "http://maps.gstatic.com/mapfiles/place_api/icons/restaurant-71.png",
         "id" : "30bee58f819b6c47bd24151802f25ecf11df8943",
         "name" : "Bucks Party Cruise",
         "opening_hours" : {
            "open_now" : true
         },
         "photos" : [
            {
               "height" : 600,
               "html_attributions" : [],
               "photo_reference" : "CnRnAAAA48AX5MsHIMiuipON_Lgh97hPiYDFkxx_vnaZQMOcvcQwYN92o33t5RwjRpOue5R47AjfMltntoz71hto40zqo7vFyxhDuuqhAChKGRQ5mdO5jv5CKWlzi182PICiOb37PiBtiFt7lSLe1SedoyrD-xIQD8xqSOaejWejYHCN4Ye2XBoUT3q2IXJQpMkmffJiBNftv8QSwF4",
               "width" : 800
            }
         ],
         "place_id" : "ChIJLfySpTOuEmsRsc_JfJtljdc",
         "scope" : "GOOGLE",
         "reference" : "CoQBdQAAANQSThnTekt-UokiTiX3oUFT6YDfdQJIG0ljlQnkLfWefcKmjxax0xmUpWjmpWdOsScl9zSyBNImmrTO9AE9DnWTdQ2hY7n-OOU4UgCfX7U0TE1Vf7jyODRISbK-u86TBJij0b2i7oUWq2bGr0cQSj8CV97U5q8SJR3AFDYi3ogqEhCMXjNLR1k8fiXTkG2BxGJmGhTqwE8C4grdjvJ0w5UsAVoOH7v8HQ",
         "types" : [ "restaurant", "food", "establishment" ],
         "vicinity" : "37 Bank St, Pyrmont"
      },
      {
         "geometry" : {
            "location" : {
               "lat" : -33.867591,
               "lng" : 151.201196
            }
         },
         "icon" : "http://maps.gstatic.com/mapfiles/place_api/icons/travel_agent-71.png",
         "id" : "a97f9fb468bcd26b68a23072a55af82d4b325e0d",
         "name" : "Australian Cruise Group",
         "opening_hours" : {
            "open_now" : true
         },
         "photos" : [
            {
               "height" : 242,
               "html_attributions" : [],
               "photo_reference" : "CnRnAAAABjeoPQ7NUU3pDitV4Vs0BgP1FLhf_iCgStUZUr4ZuNqQnc5k43jbvjKC2hTGM8SrmdJYyOyxRO3D2yutoJwVC4Vp_dzckkjG35L6LfMm5sjrOr6uyOtr2PNCp1xQylx6vhdcpW8yZjBZCvVsjNajLBIQ-z4ttAMIc8EjEZV7LsoFgRoU6OrqxvKCnkJGb9F16W57iIV4LuM",
               "width" : 200
            }
         ],
         "place_id" : "ChIJrTLr-GyuEmsRBfy61i59si0",
         "scope" : "GOOGLE",
         "reference" : "CoQBeQAAAFvf12y8veSQMdIMmAXQmus1zqkgKQ-O2KEX0Kr47rIRTy6HNsyosVl0CjvEBulIu_cujrSOgICdcxNioFDHtAxXBhqeR-8xXtm52Bp0lVwnO3LzLFY3jeo8WrsyIwNE1kQlGuWA4xklpOknHJuRXSQJVheRlYijOHSgsBQ35mOcEhC5IpbpqCMe82yR136087wZGhSziPEbooYkHLn9e5njOTuBprcfVw",
         "types" : [ "travel_agency", "restaurant", "food", "establishment" ],
         "vicinity" : "32 The Promenade, King Street Wharf 5, Sydney"
      }
   ],
   "status" : "OK"
}
*/