function search_bar_handler(){
  var city = document.getElementById("search_bar").value; 
  sessionStorage.setItem(city, setCity);
  window.location.href="/app";
}
