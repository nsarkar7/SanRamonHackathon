//map generation
var map = L.map('map').setView([37.7644, -121.9540], 13);

L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Data from Covid Act Now',
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
    console.log(name_split);
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
      /*for (let i = 0; i < data.length; i++) {
        var county = get_county(data[i]);
        console.log(county);
        show_data(county);
      }*/
    }

    else {
      console.log("No results found for "+city)
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
  var url = `/api/case_data/county?county=${county_name}`
  request.open("GET", url, false);
  request.send();

  console.log(url)
  
  var results = JSON.parse(request.responseText);
  result = results.results[0];
  
  var total_cases = result.actuals.cases;
  
  var pct_vaccinated = result.actuals.vaccinationsCompleted / result.population;
  pct_vaccinated = String(pct_vaccinated);
  pct_vaccinated = pct_vaccinated.substring(2);
  pct_vaccinated = pct_vaccinated.slice(0, 2);

  var balancer = result.population / 100000;
  var weekly_cases = parseInt(result.metrics.weeklyNewCasesPer100k * balancer);
  
  var vaxxed_score = Math.min(+(10-(pct_vaccinated-50)/5).toFixed(2), 10);
  var cdc_rating = +(result.cdcTransmissionLevel / 0.3).toFixed(2);
  var new_cases_per_100k = result.metrics.weeklyNewCasesPer100k;
  var cases_rate =  Math.min(new_cases_per_100k/100, 10);
  var infection_rate_risk = +(result.riskLevels.infectionRate / 0.3, 2).toFixed(2);

  var unfiltered_scores = [vaxxed_score, cdc_rating, cases_rate, infection_rate_risk];
  var filtered_scores = [];
  for (let i = 0; i < unfiltered_scores.length; i++) {
    if (unfiltered_scores[i] <= 100) {
      filtered_scores.push(unfiltered_scores[i]);
    }
  }
  var total = 0;
  for (let i = 0; i < filtered_scores.length; i++) {
    total += filtered_scores[i];
  }
  var score_final = +(total/filtered_scores.length).toFixed(1);
  //var risk = (not_vaxxed_alg_var + cdc_rating + cases_rate + infection_rate_risk)/5
  console.log(score_final);

  if (new_cases_per_100k == null) {
    new_cases_per_100k = "No Data Available"
  }

  var risk = "";
  var color ="";
  if (score_final <= 5) {
    risk = "Low Risk";
    color = "#00CC66";
  }
  else if (score_final >= 5 <= 7) {
    risk = "Medium Risk";
    color = "yellow"
  }
  else {
    risk = "High Risk";
    color = "red"
  }
  //weird html shit
  var table = document.getElementById("results_table");
  table.innerHTML = "";
  var row = table.insertRow(-1);
  var cell = row.insertCell(0);

  cell.className = "table_cell";

  cell.innerHTML = (`
  <div> 
    <p style="font-size: 36px; margin: 0px padding: 0px">${title_case(document.getElementById("search_bar").value)}</p>

    <p style="font-size: 24px; margin-top: 0px; color: ${color}">${risk}</p>

    <table id="risk_bar_table">
      <tr id="risk_bar_background">
        <td id="risk_bar"></td>
        <td></td>
      </tr>
    </table>

    <p style="font-size: 24px; margin-top: 8px">${weekly_cases}</p>
    <p style="font-size: 12px; margin-bottom: 4px">Weekly Cases</p>

    <p style="font-size: 24px; margin-top: 8px">${new_cases_per_100k}</p>
    <p style="font-size: 12px; margin-bottom: 4px">Weekly Cases Per 100k Population</p>

    <p style="font-size: 24px; margin: 0px">${pct_vaccinated}%</p>
    <p style="font-size: 12px; margin-bottom: 4px">Vaccinated</p>

    <p style="font-size: 4024pxpx; margin: 0px">${total_cases}</p>
    <p style="font-size: 12px; margin-bottom: 4px">Total Cases</p>
  </div>
  `);
}
