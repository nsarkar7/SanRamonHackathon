//map generation
var map = L.map('map').setView([37.7644, -121.9540], 13);

L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Data from the CDC and Covid Act Now',
    className: 'map-tiles'
}).addTo(map);

function search_city(query) {
  console.log("Searching for cities... Query: "+query);
  var request = new XMLHttpRequest();
  var url = `https://nominatim.openstreetmap.org/search.php?city=${query}&country=United States&format=jsonv2`
  request.open("GET", url, false);
  request.send();
  var results = JSON.parse(request.responseText);
  return results
}; 

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



function search_bar_handler() {
  var city = document.getElementById("search_bar").value; 
  if (city != "") {
    var data = search_city(city);
    console.log(data);
    if (data.length > 0) {
      var county = get_county(data[0]);
      console.log(county);
      map.setView([data[0].lat, data[0].lon]);
      var marker = L.marker([data[0].lat, data[0].lon]).addTo(map);
      show_data(county);
    }

    else {
      console.log("No results found for "+city)
      var table = document.getElementById("results_table");
      table.innerHTML = "";
      var row = table.insertRow(-1);
      var cell = row.insertCell(0);
      cell.className = "table_cell";

      cell.innerHTML =( `
      <p style="font-size: 14px; margin-top: 8px">City not found.</p>
      `)
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

function show_data(county_name) {  
  console.log("Getting case data...");
  
  var request = new XMLHttpRequest();
  var url = `/api/case_data/?county=${county_name}`
  request.open("GET", url, false);
  request.send();
  
  var results = JSON.parse(request.responseText);
  result = results.results[0];

  var request2 = new XMLHttpRequest();
  var url2 = `/api/cdc_data/?county=${county_name}`
  request2.open("GET", url2, false);
  request2.send();
  
  var cdc_data = JSON.parse(request2.responseText);
  cdc_data = cdc_data.results[0];
  
  var total_cases = result.actuals.cases;
  
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
  var cases_rate =  Math.min(new_cases_per_100k/60, 10);
  var infection_rate_risk = result.riskLevels.infectionRate / 0.3
  

  var unfiltered_scores = [vaxxed_score, cdc_rating, cases_rate, infection_rate_risk];
  console.log(unfiltered_scores);
  var filtered_scores = [];
  for (let i = 0; i < unfiltered_scores.length; i++) {
    if (unfiltered_scores[i] <= 100 & unfiltered_scores[i] != null) {
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
  else if (score_final >= 5 && score_final <= 7) {
    risk = "Medium Risk";
    color = "yellow"
  }
  else {
    risk = "High Risk";
    color = "red"
  }
  var cdc_rating_pretty = ["Low", "Medium", "High", "Unknown"][cdc_data.CCL_community_burden_level_integer]
  var risk_bar_width = Math.round(score_final*24.28)
  
  var table = document.getElementById("results_table");
  table.innerHTML = "";
  var row = table.insertRow(-1);
  var cell = row.insertCell(0);

  cell.className = "table_cell";

  cell.innerHTML = (`
  <div> 
    <p style="font-size: 36px; margin: 0px padding: 0px">${title_case(document.getElementById("search_bar").value)}</p>
    <p style="font-size: 16px; margin-top: -10px;">${result.county}</p> 
    <p style="font-size: 28px; margin-top: 0px; color: ${color}">${risk}</p>

    <table id="risk_bar_table">
      <tr id="risk_bar_background">
        <td id="risk_bar" style="width: ${risk_bar_width}px; background-color: ${color}"></td>
        <td></td>
      </tr>
    </table>
    <p style="font-size: 24px; margin-top: 6px">${score_final}/10</p>
    <p style="font-size: 12px; margin-botom: 4px">Calculated Risk Score</p>

    <p style="font-size: 24px; margin-top: 8px">${weekly_cases}</p>
    <p style="font-size: 12px; margin-bottom: 4px">Weekly Cases</p>

    <p style="font-size: 24px; margin: 0px">${total_cases}</p>
    <p style="font-size: 12px; margin-bottom: 4px">Total Cases</p>

    <p style="font-size: 24px; margin-top: 8px">${new_cases_per_100k}</p>
    <p style="font-size: 12px; margin-bottom: 4px">Weekly Cases Per 100k Population</p>

    <p style="font-size: 24px; margin: 0px">${vaxxed_percent_pretty}</p>
    <p style="font-size: 12px; margin-bottom: 4px">Vaccinated (at least 2 doses)</p>

    <p style="font-size: 24px; margin: 0px">${result.metrics.infectionRate}</p>
    <p style="font-size: 12px; margin-bottom: 4px">Infection Rate</p>

    <p style="font-size: 24px; margin: 0px">${cdc_rating_pretty}</p>
    <p style="font-size: 12px; margin-bottom: 4px">CDC Community Level</p>
  </div>
  `);
}


