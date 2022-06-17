import requests, json, random, time, threading, replit, urllib
from datetime import datetime
from flask import Flask, render_template, request, redirect
app = Flask(__name__)

#init variables
county_data = []
api_key = replit.db["api_key"]

#----------------------
#vaccine data:
#https://data.chhs.ca.gov/dataset/ead44d40-fd63-4f9f-950a-3b0111074de8/resource/ec32eece-7474-4488-87f0-6e91cb577458/download/covid19vaccinesbyzipcode_test.csv

@app.route("/")
def homepage():
  return render_template("home.html")

@app.route("/static/<path:path>")
def serveStaticFile(path):
  return send_from_directory("static", path)

@app.route("/api/case_data/county")
def get_case_data():
  query = request.args.get("county")
  if query == None:
    return "County cannot be empty"
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

@app.route("/api/case_data/")
def get_all_case_data():
  return {"results": county_data}

def download_cases():
  global county_data
  endpoint_url = "https://api.covidactnow.org/v2/counties.json?apiKey="+api_key
  r = requests.get(endpoint_url)
  county_data = r.json()

if __name__ == "__main__":
  print("Downloading case info...")
  download_cases()
  print("Done!")
  
  app.run(host="0.0.0.0")
 