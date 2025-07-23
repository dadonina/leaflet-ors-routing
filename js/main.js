const apiKey = 'YOUR_API_KEY';
// Initialize the map centered on Barcelona
const map = L.map("map").setView([41.390205, 2.154007], 13);

// Add OpenStreetMap base tiles
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

// State variables
let markers = [];
let currentRouteLayer = null;
let accumulatedSummaries = [];

// Handle map click: add up to two markers, then request route
map.on("click", function (e) {
  // If user clicks a third time, start over
  if (markers.length >= 2) {
    clearRoute();
  }

  // Define custom icon depending on start or end
  const isStart = markers.length === 0;
  const iconColor = isStart ? "green" : "red";

  const customIcon = L.divIcon({
    className: "custom-div-icon",
    html: `<div class="circle-marker ${iconColor}"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  const marker = L.marker(e.latlng, { icon: customIcon }).addTo(map);
  markers.push(marker);

  if (markers.length === 2) {
    const mode = document.getElementById("mode").value;
    getRoute(markers[0].getLatLng(), markers[1].getLatLng(), mode);
  }
});


// Handle mode change: re-request route if both markers are set
document.getElementById("mode").addEventListener("change", () => {
  if (markers.length === 2) {
    const mode = document.getElementById("mode").value;
    getRoute(markers[0].getLatLng(), markers[1].getLatLng(), mode);
  }
});

// Clear all route-related UI and map elements
function clearRoute() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  if (currentRouteLayer) {
    map.removeLayer(currentRouteLayer);
    currentRouteLayer = null;
  }

  document.getElementById("info").textContent = "";
  document.getElementById("directions").innerHTML = "";
  accumulatedSummaries = [];
}

// Handle "Clear Route" button
document.getElementById("clear").addEventListener("click", clearRoute);


/**
 * Fetch and render a route from OpenRouteService between two points,
 * using the selected transport mode. Replaces previous route and instructions,
 * and accumulates mode summaries in the info panel.
 */
function getRoute(start, end, mode) {
  //const apiKey = "TU_API_KEY_AQUI"; // Replace with your OpenRouteService key
  const url = `https://api.openrouteservice.org/v2/directions/${mode}/geojson`;

  fetch(url, {
    method: "POST",
    headers: {
      "Authorization": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      coordinates: [
        [start.lng, start.lat],
        [end.lng, end.lat]
      ],
      instructions: true
    })
  })
    .then(response => response.json())
    .then(data => {
      // Remove previous route layer if any
      if (currentRouteLayer) {
        map.removeLayer(currentRouteLayer);
      }

      // Add new route to the map
      currentRouteLayer = L.geoJSON(data).addTo(map);

      // Extract route details
      const summary = data.features[0].properties.summary;
      const steps = data.features[0].properties.segments[0].steps;
      const modeLabel = mode.replace("-", " ");

      // Replace instructions in the sidebar
      const directionsDiv = document.getElementById("directions");
      directionsDiv.innerHTML =
        `<h6>${modeLabel}</h6><ol>` +
        steps.map(step =>
          `<li>${step.instruction} (${step.distance.toFixed(0)} m)</li>`
        ).join("") +
        "</ol>";

      // Store summary for this route
      accumulatedSummaries.push({
        mode: modeLabel,
        distance: (summary.distance / 1000).toFixed(2),
        duration: (summary.duration / 60).toFixed(1)
      });

      // Update info panel with all route summaries
      const infoDiv = document.getElementById("info");
      infoDiv.innerHTML = accumulatedSummaries.map(item =>
        `<p><strong>${item.mode}</strong>: ${item.distance} km, ${item.duration} min</p>`
      ).join("");
    })
    .catch(err => {
      console.error("Route fetch error:", err);
      alert("An error occurred while retrieving the route.");
    });
}
