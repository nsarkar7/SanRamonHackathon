import requests, json, random, time, threading, replit, urllib, re
from datetime import datetime
from flask import Flask, render_template, request, redirect
app = Flask(__name__)

#init variables
county_data = []
cdc_ratings = []
api_key = replit.db["api_key"]

#----------------------
#cdc data
#https://www.cdc.gov/coronavirus/2019-ncov/json/cdt-ccl-data.json

@app.route("/")
def homepage():
  return render_template("home.html")

@app.route("/app")
def app_page():
  return render_template("app.html")

@app.route("/api/fips/")
def get_fips_code():
  x = request.args.get("x")
  y = request.args.get("y")
  if y == None or x == None:
    return "Invalid coordinates."

  url = "https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x={x}&y={y}&benchmark=4&vintage=4"
  url = url.format(x=str(x), y=str(y))

  html = requests.get(url).text

  regex1 = r'<span class="resultHeading">Counties: <\/span>([\s\S]*?)<hr class="resultsHr2">'
  html_cut = re.findall(regex1, html)[0]

  fips_regex = r'<span class="resultItem">GEOID: <\/span>([\s\S]*?)<br>'
  fips_code = re.findall(fips_regex, html_cut)[0]

  return fips_code

@app.route("/static/<path:path>")
def serveStaticFile(path):
  return send_from_directory("static", path)

@app.route("/api/case_data/")
def get_case_data():
  query = request.args.get("county")
  fips = request.args.get("fips")
  if fips != None:
    for county in county_data:
      if county["fips"] == fips:
        return {"results": [county, 0]}
  else:
    if query == None:
      return {"results": county_data}
    else:
      query = query.lower()
    
      results = []
      query_split = query.split(" ")
      for county in county_data:
        if county["country"] == "US" and county["county"] != None:
          name_split = county["county"].lower().split(" ")
          matches = list(set(name_split)&set(query_split))
          if len(matches) > 0:
            results.append((county, len(matches)))
      results = sorted(results, key=lambda x: x[1], reverse=True)
    
      if len(results) < 1:
        return {"results": []}
      return {"results": results[0]}

@app.route("/api/cdc_data/")
def get_cdc_data():
  query = request.args.get("county")
  fips = request.args.get("fips")
  if fips != None:
    for county in cdc_ratings:
      if county["fips_code"] == fips:
        return {"results": [county, 0]}
  else:
    if query == None:
      return {"results": cdc_ratings}
    else:
      query = query.lower()
    
      results = []
      query_split = query.split(" ")
      for county in cdc_ratings:
        name_split = county["County"].lower().split(" ")
        matches = list(set(name_split)&set(query_split))
        if len(matches) > 0:
          results.append((county, len(matches)))
      results = sorted(results, key=lambda x: x[1], reverse=True)

  if len(results) < 1:
    return {"results": []}
  return {"results": results[0]}

def download_cases():
  global county_data
  endpoint_url = "https://api.covidactnow.org/v2/counties.json?apiKey="+api_key
  r = requests.get(endpoint_url)
  county_data = r.json()

def download_cdc_ratings():
  global cdc_ratings
  endpoint_url = "https://www.cdc.gov/coronavirus/2019-ncov/json/cdt-ccl-data.json"
  r = requests.get(endpoint_url)
  cdc_ratings = r.json()["integrated_county_latest_external_data"]


if __name__ == "__main__":
  print("Downloading case info...")
  download_cases()
  print("Downloading CDC Community Scores...")
  download_cdc_ratings()
  print("Done!")
  
  app.run(host="0.0.0.0")
 