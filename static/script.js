//map generation
var map = L.map('map').setView([37.7644, -121.9540], 13);

L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Data from the CDC and Covid Act Now',
    className: 'map-tiles'
}).addTo(map);
var layerGroup = L.layerGroup().addTo(map);

function search_city(query) {
  console.log("Searching for cities... Query: "+query);
  var request = new XMLHttpRequest();
  var url = `https://nominatim.openstreetmap.org/search.php?city=${query}&country=United States&format=jsonv2`
  request.open("GET", url, false);
  request.send();
  var results = JSON.parse(request.responseText);
  return results
}; 

//unused
function get_county(city) {
  var name_split = city.display_name.split(", ");
  if (name_split.pop() == "United States") {
    if (name_split.length == 2 | name_split.length == 1) {
      var county = name_split[0];
    }
    else if (name_split.length > 3) {
      var county = null;
      for (let i = 0; i < name_split.length; i++) {
        if (name_split[i].toLowerCase().includes("county")) {
          var county = name_split[i];
        }
      }
      if (county == null) {
        return "County not found. Raw city name: "+city.display_name;
      }
    }
    else {
      var county = name_split[1];
    }
    return county;
  }
  else {
    return "City not in US.";
  }
}

function get_county_fips(city) {
  var request = new XMLHttpRequest();
  var url = `/api/fips/?x=${city.lon}&y=${city.lat}`
  request.open("GET", url, false);
  request.send();
  
 return request.responseText;
}

function search_bar_handler() {
  var city = document.getElementById("search_bar").value; 
  if (city != "") {
    var div = document.getElementById("results_div");
    div.innerHTML = "";
    div.innerHTML = (`
      <p style="font-size: 14px; margin-top: 8px">Loading results...</p>`
      );
    
    setTimeout(function() {
        run(city);
    }, 100);

    function run(city) {
      var data = search_city(city);
      if (data.length > 0) {
        var fips = get_county_fips(data[0]);
        map.setView([data[0].lat, data[0].lon]);
        layerGroup.clearLayers();
        var marker = L.marker([data[0].lat, data[0].lon]).addTo(layerGroup);
        show_data(fips);
      }
  
      else {
        console.log("No results found for "+city)
  
        div.innerHTML = ( `
        <p style="font-size: 14px; margin-top: 8px">City not found.</p>
        `)
      }
    }
  }
  else {
    console.log("Input cannot be blank.")
  }
}

function title_case(str) {
  return str.replace(
    /\w\S*/g,
    function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
}

function show_data(fips) {  
  console.log("Getting case data...");

  var div = document.getElementById("results_div");
  
  var request = new XMLHttpRequest();
  var url = `/api/case_data/?fips=${fips}`
  request.open("GET", url, false);
  request.send();
  var results = JSON.parse(request.responseText);
  result = results.results[0];

  var request2 = new XMLHttpRequest();
  var url2 = `/api/cdc_data/?fips=${fips}`
  request2.open("GET", url2, false);
  request2.send();
  var cdc_data = JSON.parse(request2.responseText);
  cdc_data = cdc_data.results[0];
  
  var pct_vaccinated = Math.round((result.actuals.vaccinationsCompleted / result.population)*100);
  var balancer = result.population / 100000;
  var weekly_cases = parseInt(result.metrics.weeklyNewCasesPer100k * balancer);

  console.log(result);
  if (pct_vaccinated != 0) {
    var vaxxed_score = Math.min(+(10-(pct_vaccinated-50)/5).toFixed(2), 10);
    var vaxxed_percent_pretty = pct_vaccinated+"%";
  }
  else {
    var vaxxed_score = null;
    var vaxxed_percent_pretty = "Unknown";
  }
  console.log(cdc_data);
  var cdc_rating = +((parseInt(cdc_data.CCL_community_burden_level_integer)+1) / 0.3).toFixed(2);
  var new_cases_per_100k = result.metrics.weeklyNewCasesPer100k;
  var cases_rate =  result.riskLevels.caseDensity * 2;
  var infection_rate_risk = result.riskLevels.infectionRate*2;
  
  var test_positivity_ratio = result.metrics.testPositivityRatio;
  var test_positivity_score = result.riskLevels.testPositivityRatio*2;

  var unfiltered_scores = [vaxxed_score, cdc_rating, cases_rate, infection_rate_risk, test_positivity_score];
  console.log(unfiltered_scores); 
  var filtered_scores = [];
  for (let i = 0; i < unfiltered_scores.length; i++) {
    if (unfiltered_scores[i] <= 10 & unfiltered_scores[i] != null) {
      filtered_scores.push(unfiltered_scores[i]);
    }
  }
  var total = 0;
  for (let i = 0; i < filtered_scores.length; i++) {
    total += filtered_scores[i];
  }
  var score_final = +(total/filtered_scores.length).toFixed(1);
  console.log("Score: " + score_final);

  if (new_cases_per_100k == null) {
    new_cases_per_100k = "No Data Available"
  }

  var risk = "";
  var color ="";
  if (score_final <= 5) {
    risk = "Low Risk";
    color = "#00CC66";
  }
  else if (score_final >= 5 && score_final < 7) {
    risk = "Medium Risk";
    color = "yellow"
  }
  else {
    risk = "High Risk";
    color = "red"
  }
  var cdc_rating_pretty = ["Low", "Medium", "High", "Unknown"][cdc_data.CCL_community_burden_level_integer]
  var risk_bar_width = Math.round(score_final*24.28);

  if (result.metrics.infectionRate != null) {
    var infection_rate_pretty = result.metrics.infectionRate;
  }
  else {
    var infection_rate_pretty = "Unknown"
  }
  if (result.actuals.cases != null) {
    var case_count_pretty = result.actuals.cases;
  }
  else {
    var case_count_pretty = "Unknown";
  }
  if (test_positivity_ratio != null) {
    var test_positivity_ratio_pretty = result.metrics.testPositivityRatio;
  }
  else {
    var test_positivity_ratio_pretty = "Unknown";
  }

  div.innerHTML = "";
  div.innerHTML =  (`
  <div style="text-align: center;"> 
    <p style="font-size: 36px; margin: 0px padding: 0px">${title_case(document.getElementById("search_bar").value)}</p>
    <p style="font-size: 16px; margin-top: -10px;">${result.county}, ${result.state}</p> 
    <p style="font-size: 28px; margin-top: 0px; color: ${color}">${risk}</p>
    <table id="risk_bar_table">
      <tr id="risk_bar_background">
        <td id="risk_bar" style="width: ${risk_bar_width}px; background-color: ${color}"></td>
        <td></td>
      </tr>
    </table>
    <p style="font-size: 24px; margin-top: 6px">${score_final}/10</p>
    <p class="text2">Overall Risk Score</p>
    
    <hr style="margin-left: auto; margin-right: auto; margin-top: 8px; width: 300px">

    <p class="text1">${weekly_cases}</p>
    <p class="text2">Weekly New Cases</p>

    <p class="text1">${case_count_pretty}</p>
    <p class="text2">Total Cases</p>

    <p class="text1">${new_cases_per_100k}</p>
    <p class="text2">Weekly Cases Per 100k Population</p>

    <p class="text1">${vaxxed_percent_pretty}</p>
    <p class="text2">Vaccination Rate (at least 2 doses)</p>

    <p class="text1">${infection_rate_pretty}</p>
    <p class="text2">Infection Rate</p>

    <p class="text1">${cdc_rating_pretty}</p>
    <p class="text2">CDC Community Level</p>

    <p class="text1">${result.actuals.deaths}</p>
    <p class="text2">Total Deaths</p>

    <p class="text1">${test_positivity_ratio_pretty}</p>
    <p class="text2">Test Positivity Ratio</p>
  </div>
  `);
}


