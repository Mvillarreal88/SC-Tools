/**
 * Star Citizen Cargo Route Optimizer - Main JavaScript
 */

// Global variables
let map;
let locations = [];
let routePolyline = null;
let locationMarkers = {};
let ships = {
    "taurus": { name: "Constellation Taurus", capacity: 168 },
    "freelancer": { name: "Freelancer", capacity: 66 },
    "cutlass_black": { name: "Cutlass Black", capacity: 46 },
    "caterpillar": { name: "Caterpillar", capacity: 576 },
    "c2_hercules": { name: "C2 Hercules", capacity: 696 }
};

// Star Citizen cargo types
const cargoTypes = [
    "Agricium",
    "Agricultural Supplies",
    "Altruciatoxin",
    "Aluminum",
    "Astatine",
    "Beryl",
    "Chlorine",
    "Consumer Electronics",
    "Copper",
    "Corundum",
    "Diamond",
    "Distilled Spirits",
    "E'tam",
    "Fluorine",
    "Gold",
    "Hydrogen",
    "Iodine",
    "Laranite",
    "Medical Supplies",
    "Medpens",
    "NEON",
    "Processed Food",
    "Quartz",
    "Raw Minerals",
    "Revenant Tree Pollen",
    "Scrap",
    "Stims",
    "Titanium",
    "Tungsten",
    "Waste",
    "Widow"
];

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    loadLocationData();
    setupEventListeners();
});

/**
 * Initialize the Stanton system map
 */
function initMap() {
    // Stanton system map boundaries (in millions of km, approximated)
    const mapBounds = [
        [-40, -40], // Southwest corner
        [40, 40]    // Northeast corner
    ];
    
    // Create the map with custom options
    map = L.map('stanton-map', {
        crs: L.CRS.Simple, // Use simple coordinate reference system
        attributionControl: false,
        zoomControl: true,
        minZoom: -2,
        maxZoom: 2,
        zoomDelta: 0.5,
        zoomSnap: 0.5,
        maxBounds: mapBounds,
        inertia: true
    }).setView([0, 0], -1); // Center on Crusader at zoom level -1
    
    // Apply bounds to the map
    map.fitBounds(mapBounds);
    
    // Create a starry background using CSS
    document.querySelector('#stanton-map').style.backgroundColor = '#050912';
    document.querySelector('#stanton-map').style.backgroundImage = 'radial-gradient(white, rgba(255,255,255,.2) 2px, transparent 2px)';
    document.querySelector('#stanton-map').style.backgroundSize = '100px 100px';
    
    // Add orbital paths for major planets (approximate circles)
    // Crusader at origin
    addOrbitalPath(map, [0, 0], 0.1, '#ffcc0044');
    
    // ArcCorp orbit
    addOrbitalPath(map, [0, 0], 18.5, '#3a85ad44');
    
    // Hurston orbit
    addOrbitalPath(map, [0, 0], 16.6, '#ad873a44');
    
    // microTech orbit
    addOrbitalPath(map, [0, 0], 44.0, '#3aad7744');
    
    // Add Stanton star at the center (visual reference)
    L.circle([0, 0], {
        radius: 3,
        color: '#ffcc00',
        fillColor: '#ffcc00',
        fillOpacity: 1
    }).addTo(map);
    
    // Add planet labels for major celestial bodies
    addMapLabel("Stanton", [0, 0], 'star');
    
    // Add grid lines (optional)
    addGridLines(map, 10, '#333');
}

/**
 * Add an orbital path (circle) to the map
 */
function addOrbitalPath(map, center, radius, color) {
    const points = [];
    const segments = 64;
    
    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = center[0] + radius * Math.cos(angle);
        const y = center[1] + radius * Math.sin(angle);
        points.push([x, y]);
    }
    
    // Close the circle
    points.push(points[0]);
    
    L.polyline(points, {
        color: color,
        weight: 1.5,
        opacity: 0.8
    }).addTo(map);
}

/**
 * Add a text label to the map
 */
function addMapLabel(text, position, type) {
    let className = 'map-label';
    if (type) {
        className += ' ' + type + '-label';
    }
    
    const icon = L.divIcon({
        className: className,
        html: text,
        iconSize: [100, 20],
        iconAnchor: [50, 10]
    });
    
    L.marker(position, {
        icon: icon,
        interactive: false
    }).addTo(map);
}

/**
 * Add grid lines to the map
 */
function addGridLines(map, spacing, color) {
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    
    // Add vertical grid lines
    for (let x = Math.floor(sw.lng); x <= Math.ceil(ne.lng); x += spacing) {
        L.polyline([[sw.lat, x], [ne.lat, x]], {
            color: color,
            weight: 0.5,
            opacity: 0.5
        }).addTo(map);
    }
    
    // Add horizontal grid lines
    for (let y = Math.floor(sw.lat); y <= Math.ceil(ne.lat); y += spacing) {
        L.polyline([[y, sw.lng], [y, ne.lng]], {
            color: color,
            weight: 0.5,
            opacity: 0.5
        }).addTo(map);
    }
}

/**
 * Load location data from the server
 */
function loadLocationData() {
    console.log("Fetching location data from server...");
    
    // Clear any cached locations
    locations = [];
    
    // Add cache-busting parameter to force reload
    fetch('/api/locations?t=' + new Date().getTime())
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data || data.error) {
                throw new Error(data.error || 'Invalid location data received');
            }
            console.log(`Loaded ${data.length} locations from server`);
            
            // Debug logging
            console.log("DEBUG: Checking for specific locations in frontend data:");
            const locationNames = data.map(loc => loc.name);
            console.log("DEBUG: All locations:", locationNames);
            console.log("DEBUG: Has Riker Memorial Spaceport:", locationNames.includes("Riker Memorial Spaceport"));
            console.log("DEBUG: Has Samson & Son's Salvage Center:", locationNames.includes("Samson & Son's Salvage Center"));
            console.log("DEBUG: Has CRU-L4 Shallow Fields Station:", locationNames.includes("CRU-L4 Shallow Fields Station"));
            
            locations = data;
            populateLocationSelects();
            addLocationsToMap();
            
            // Add the first mission after data is loaded
            addMission();
        })
        .catch(error => {
            console.error('Error loading location data:', error);
            // Use hardcoded locations for demo purposes if server data fails
            console.log("Using fallback location data");
            useFallbackLocations();
            
            // Add the first mission after fallback data is loaded
            addMission();
        });
}

/**
 * Use fallback location data if server fetch fails
 */
function useFallbackLocations() {
    // Basic fallback data for demo purposes
    console.log("DEBUG: Using fallback locations");
    locations = [
        // Crusader and moons
        { name: "Crusader", type: "planet", coordinates: [0, 0] },
        { name: "Orison", type: "landing_zone", coordinates: [0.01, 0.01] },
        { name: "Port Olisar", type: "station", coordinates: [0.08, 0.08] },
        { name: "Grim HEX", type: "station", coordinates: [-0.2, -0.1] },
        { name: "CRU-L1 Ambitious Dream Station", type: "station", coordinates: [5.0, 0] },
        { name: "CRU-L2 Shallow Fields Station", type: "station", coordinates: [-5.0, 0] },
        { name: "CRU-L3 Wide Forest Station", type: "station", coordinates: [0, -5.0] },
        { name: "CRU-L4 Shallow Fields Station", type: "station", coordinates: [5.0, 0] },
        { name: "CRU-L5 Beautiful Glen Station", type: "station", coordinates: [-2.5, 4.3] },
        
        // Cellin outposts
        { name: "Cellin", type: "moon", coordinates: [0.3, 0] },
        { name: "Galette Family Farms", type: "outpost", coordinates: [0.31, 0.015] },
        { name: "Hickes Research Outpost", type: "outpost", coordinates: [0.305, 0.02] },
        { name: "Terra Mills Hydro Farm", type: "outpost", coordinates: [0.295, -0.008] },
        { name: "Tram & Meyers Mining", type: "outpost", coordinates: [0.315, 0.012] },
        
        // Daymar outposts
        { name: "Daymar", type: "moon", coordinates: [0, 0.5] },
        { name: "ArcCorp Mining Area 141", type: "outpost", coordinates: [0.01, 0.505] },
        { name: "Bountiful Harvest Hydroponics", type: "outpost", coordinates: [-0.005, 0.51] },
        { name: "Kudre Ore", type: "outpost", coordinates: [0.005, 0.49] },
        { name: "Shubin Mining Facility SCD-1", type: "outpost", coordinates: [-0.008, 0.495] },
        { name: "Brio's Breaker Yard", type: "outpost", coordinates: [0.012, 0.507] },
        { name: "Nuen Waste Management", type: "outpost", coordinates: [-0.007, 0.486] },
        
        // Yela outposts
        { name: "Yela", type: "moon", coordinates: [-0.4, -0.2] },
        { name: "ArcCorp Mining Area 157", type: "outpost", coordinates: [-0.405, -0.195] },
        { name: "Benson Mining Outpost", type: "outpost", coordinates: [-0.395, -0.205] },
        { name: "Deakins Research Outpost", type: "outpost", coordinates: [-0.41, -0.21] },
        { name: "Jumptown", type: "outpost", coordinates: [-0.39, -0.19] },
        { name: "NT-999 XX", type: "outpost", coordinates: [-0.385, -0.21] },
        { name: "Kosso Basin", type: "outpost", coordinates: [-0.415, -0.188] },
        
        // Hurston and moons
        { name: "Hurston", type: "planet", coordinates: [-16.55, -1.65] },
        { name: "Lorville", type: "landing_zone", coordinates: [-16.54, -1.64] },
        { name: "Everus Harbor", type: "station", coordinates: [-16.56, -1.60] },
        { name: "HUR-L1 Green Glade Station", type: "station", coordinates: [-12.0, -1.5] },
        { name: "HUR-L2 Stormbreaker Station", type: "station", coordinates: [-20.0, -1.65] },
        { name: "HUR-L3 Red Festival Station", type: "station", coordinates: [-16.55, 6.5] },
        { name: "HUR-L4 Melodic Retreat Station", type: "station", coordinates: [-10.0, -10.0] },
        { name: "HUR-L5 Faithful Retreat Station", type: "station", coordinates: [-21.0, 3.0] },
        { name: "Teasa Spaceport", type: "spaceport", coordinates: [-16.539, -1.641] },
        
        // Aberdeen outposts
        { name: "Aberdeen", type: "moon", coordinates: [-16.75, -1.75] },
        { name: "HDMS Anderson", type: "outpost", coordinates: [-16.755, -1.747] },
        { name: "HDMS Norgaard", type: "outpost", coordinates: [-16.745, -1.757] },
        { name: "Klescher Rehabilitation Facility", type: "outpost", coordinates: [-16.76, -1.762] },
        
        // Arial outposts
        { name: "Arial", type: "moon", coordinates: [-16.35, -1.55] },
        { name: "HDMS Bezdek", type: "outpost", coordinates: [-16.355, -1.547] },
        { name: "HDMS Lathan", type: "outpost", coordinates: [-16.345, -1.557] },
        
        // ArcCorp and moons
        { name: "ArcCorp", type: "planet", coordinates: [18.37, 2.65] },
        { name: "Area18", type: "landing_zone", coordinates: [18.36, 2.66] },
        { name: "Baijini Point", type: "station", coordinates: [18.38, 2.69] },
        { name: "ARC-L1 Conn Station", type: "station", coordinates: [12.0, 1.5] },
        { name: "ARC-L2 Wide Forest Station", type: "station", coordinates: [24.0, 2.65] },
        { name: "ARC-L3 Shallow Fields Station", type: "station", coordinates: [18.37, -3.5] },
        { name: "ARC-L4 Stone Henge Station", type: "station", coordinates: [12.0, 3.5] },
        { name: "ARC-L5 Bountiful Harvest Station", type: "station", coordinates: [22.0, 5.0] },
        { name: "Riker Memorial Spaceport", type: "spaceport", coordinates: [18.362, 2.663] },
        
        // Lyria outposts
        { name: "Lyria", type: "moon", coordinates: [18.57, 2.75] },
        { name: "Loveridge Mineral Reserve", type: "outpost", coordinates: [18.577, 2.747] },
        { name: "Humboldt Mines", type: "outpost", coordinates: [18.567, 2.757] },
        { name: "Shubin Mining Facility SAL-2", type: "outpost", coordinates: [18.582, 2.762] },
        { name: "The Orphanage", type: "outpost", coordinates: [18.562, 2.742] },
        { name: "Paradise Cove", type: "outpost", coordinates: [18.569, 2.749] },
        { name: "Dulli Research Facility", type: "outpost", coordinates: [18.586, 2.755] },
        
        // Wala outposts
        { name: "Wala", type: "moon", coordinates: [18.17, 2.55] },
        { name: "ArcCorp Mining Area 045", type: "outpost", coordinates: [18.177, 2.547] },
        { name: "ArcCorp Mining Area 048", type: "outpost", coordinates: [18.167, 2.557] },
        { name: "ArcCorp Mining Area 056", type: "outpost", coordinates: [18.181, 2.562] },
        { name: "ArcCorp Mining Area 061", type: "outpost", coordinates: [18.161, 2.542] },
        { name: "Samson & Son's Salvage Center", type: "outpost", coordinates: [18.172, 2.552] },
        
        // microTech and moons
        { name: "microTech", type: "planet", coordinates: [23.0, 37.92] },
        { name: "New Babbage", type: "landing_zone", coordinates: [22.99, 37.93] },
        { name: "Port Tressler", type: "station", coordinates: [23.0, 37.99] },
        { name: "MIC-L1 Shallow Frontier Station", type: "station", coordinates: [18.0, 30.0] },
        { name: "MIC-L2 Torchbearer Station", type: "station", coordinates: [28.0, 37.92] },
        { name: "MIC-L3 Harmonious Haven Station", type: "station", coordinates: [23.0, 32.0] },
        { name: "MIC-L4 Outpost Station", type: "station", coordinates: [18.0, 40.0] },
        { name: "MIC-L5 Steel Hollow Station", type: "station", coordinates: [26.0, 41.0] },
        { name: "Aspire Grand", type: "spaceport", coordinates: [22.989, 37.931] },
        
        // Calliope outposts
        { name: "Calliope", type: "moon", coordinates: [23.2, 38.12] },
        { name: "Rayari Deltana Research Outpost", type: "outpost", coordinates: [23.205, 38.114] },
        { name: "Shubin Mining Facility SMO-18", type: "outpost", coordinates: [23.195, 38.124] },
        { name: "Nuiqsut Research Facility", type: "outpost", coordinates: [23.21, 38.11] },
        
        // Clio outposts
        { name: "Clio", type: "moon", coordinates: [22.8, 37.72] },
        { name: "Shubin Mining Facility SMO-13", type: "outpost", coordinates: [22.805, 37.714] },
        { name: "Rayari Anvik Research Outpost", type: "outpost", coordinates: [22.795, 37.725] },
        { name: "Druglab Paradise Cove", type: "outpost", coordinates: [22.81, 37.71] },
        
        // Euterpe outposts
        { name: "Euterpe", type: "moon", coordinates: [23.1, 37.82] },
        { name: "Shubin Mining Facility SMO-22", type: "outpost", coordinates: [23.105, 37.814] },
        { name: "Bud's Growery", type: "outpost", coordinates: [23.09, 37.83] }
    ];
    
    console.log("DEBUG: Fallback locations count:", locations.length);
    console.log("DEBUG: Has Riker Memorial Spaceport in fallback:", locations.some(loc => loc.name === "Riker Memorial Spaceport"));
    console.log("DEBUG: Has Samson & Son's Salvage Center in fallback:", locations.some(loc => loc.name === "Samson & Son's Salvage Center"));
    console.log("DEBUG: Has CRU-L4 in fallback:", locations.some(loc => loc.name === "CRU-L4 Shallow Fields Station"));
    
    // Populate UI with fallback data
    populateLocationSelects();
    addLocationsToMap();
}

/**
 * Populate all location select dropdowns
 */
function populateLocationSelects() {
    // Get all location select elements
    const startLocationSelect = document.getElementById('start-location');
    
    // Clear existing options (except the default)
    startLocationSelect.innerHTML = '<option value="" disabled selected>Select a location</option>';
    
    // Add location options
    locations.forEach(location => {
        const option = document.createElement('option');
        option.value = location.name;
        option.textContent = location.name;
        startLocationSelect.appendChild(option);
    });
    
    // Update any existing mission selects
    updateMissionLocationSelects();
}

/**
 * Update all mission location select dropdowns
 */
function updateMissionLocationSelects() {
    // Get all pickup and dropoff selects
    const pickupSelects = document.querySelectorAll('.pickup-location');
    const dropoffSelects = document.querySelectorAll('.dropoff-location');
    
    // Update each select
    pickupSelects.forEach(select => updateLocationSelect(select));
    dropoffSelects.forEach(select => updateLocationSelect(select));
}

/**
 * Update a single location select dropdown
 */
function updateLocationSelect(select) {
    // Save the current value
    const currentValue = select.value;
    
    // Clear existing options (except the default)
    select.innerHTML = '<option value="" disabled selected>Select location</option>';
    
    // Sort locations alphabetically by name
    const sortedLocations = [...locations].sort((a, b) => a.name.localeCompare(b.name));
    
    // Add location options
    sortedLocations.forEach(location => {
        const option = document.createElement('option');
        option.value = location.name;
        option.textContent = location.name;
        select.appendChild(option);
    });
    
    // Restore the previous value if it exists
    if (currentValue) {
        select.value = currentValue;
    }
}

/**
 * Add all locations to the map
 */
function addLocationsToMap() {
    locations.forEach(location => {
        const [x, z] = location.coordinates;
        
        // Create a marker based on location type
        let marker;
        
        if (location.type === 'planet') {
            marker = L.circleMarker([z, x], {
                radius: 7,
                color: '#ffffff',
                fillColor: '#4ab6ff',
                fillOpacity: 1,
                weight: 2
            });
            
            // Add a label for planets
            addMapLabel(location.name, [z, x], 'planet');
        } else if (location.type === 'landing_zone') {
            marker = L.circleMarker([z, x], {
                radius: 5,
                color: '#ffffff',
                fillColor: '#42d392',
                fillOpacity: 1,
                weight: 1.5
            });
        } else if (location.type === 'station') {
            marker = L.circleMarker([z, x], {
                radius: 4,
                color: '#ffffff',
                fillColor: '#e63946',
                fillOpacity: 1,
                weight: 1.5
            });
        } else if (location.type === 'moon') {
            marker = L.circleMarker([z, x], {
                radius: 4,
                color: '#ffffff',
                fillColor: '#dddddd',
                fillOpacity: 1,
                weight: 1.5
            });
        } else if (location.type === 'lagrange') {
            marker = L.circleMarker([z, x], {
                radius: 3,
                color: '#ffffff',
                fillColor: '#ffcc00',
                fillOpacity: 1,
                weight: 1.5
            });
        } else {
            marker = L.circleMarker([z, x], {
                radius: 3,
                color: '#ffffff',
                fillColor: '#999999',
                fillOpacity: 1,
                weight: 1.5
            });
        }
        
        // Add a popup with location name
        marker.bindPopup(`<div class="location-popup"><h4>${location.name}</h4><p>Type: ${location.type}</p></div>`);
        
        // Add to the map
        marker.addTo(map);
        
        // Store the marker for later
        locationMarkers[location.name] = marker;
    });
}

/**
 * Setup event listeners for UI interactions
 */
function setupEventListeners() {
    // Ship selection change
    document.getElementById('ship-select').addEventListener('change', function() {
        const shipId = this.value;
        const capacity = ships[shipId].capacity;
        document.getElementById('cargo-capacity').textContent = capacity + ' SCU';
    });
    
    // Add mission button
    document.getElementById('add-mission-btn').addEventListener('click', addMission);
    
    // Calculate route button
    document.getElementById('calculate-route-btn').addEventListener('click', calculateRoute);
    
    // Add reset progress button to results panel
    const resultsPanel = document.getElementById('route-results');
    const summaryDiv = resultsPanel.querySelector('.route-summary');
    addResetProgressButton(summaryDiv);
    
    // Delegation for dynamically added elements
    document.addEventListener('click', function(event) {
        // Remove mission button
        if (event.target.classList.contains('remove-mission-btn')) {
            const missionItem = event.target.closest('.mission-item');
            missionItem.remove();
            updateMissionNumbers();
        }
        
        // Add dropoff location button
        if (event.target.classList.contains('add-dropoff-btn')) {
            const missionItem = event.target.closest('.mission-item');
            addDropoffLocation(missionItem);
        }
        
        // Remove dropoff location button
        if (event.target.classList.contains('remove-dropoff-btn')) {
            const dropoffItem = event.target.closest('.dropoff-item');
            dropoffItem.remove();
        }
    });
}

/**
 * Add a new mission item to the mission list
 */
function addMission() {
    // Get the template
    const template = document.getElementById('mission-template');
    const clone = document.importNode(template.content, true);
    
    // Get the current mission count
    const missionCount = document.querySelectorAll('.mission-item').length + 1;
    
    // Update the mission number
    clone.querySelector('.mission-number').textContent = `Mission ${missionCount}`;
    
    // Add the mission to the container before setting up dropdowns
    // so they are in the DOM
    const missionsContainer = document.getElementById('missions-container');
    missionsContainer.appendChild(clone);
    
    // Get the newly added mission item
    const missionItem = missionsContainer.lastElementChild;
    
    // Populate pickup location
    const pickupSelect = missionItem.querySelector('.pickup-location');
    updateLocationSelect(pickupSelect);
    
    // Add event listeners for this mission
    setupMissionEvents(missionItem);
    
    // Automatically add one dropoff location for convenience
    addDropoffLocation(missionItem);
}

/**
 * Set up event listeners for a mission item
 */
function setupMissionEvents(missionItem) {
    // Add dropoff button
    missionItem.querySelector('.add-dropoff-btn').addEventListener('click', function() {
        addDropoffLocation(missionItem);
    });
    
    // Remove mission button
    missionItem.querySelector('.remove-mission-btn').addEventListener('click', function() {
        missionItem.remove();
        updateMissionNumbers();
    });
}

/**
 * Populate a select element with cargo type options
 */
function populateCargoTypeSelect(select) {
    // Clear existing options
    select.innerHTML = '';
    
    // Add cargo type options
    cargoTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        select.appendChild(option);
    });
    
    // Always set Medical Supplies as default
    select.value = "Medical Supplies";
}

/**
 * Update mission numbers after removal
 */
function updateMissionNumbers() {
    const missionItems = document.querySelectorAll('.mission-item');
    missionItems.forEach((item, index) => {
        item.querySelector('.mission-number').textContent = `Mission ${index + 1}`;
    });
}

/**
 * Add a new dropoff location to a mission
 */
function addDropoffLocation(missionItem) {
    const dropoffLocations = missionItem.querySelector('.dropoff-locations');
    const template = document.createElement('div');
    template.className = 'dropoff-item mb-2';
    template.innerHTML = `
        <div class="row g-2">
            <div class="col-5">
                <select class="form-select dropoff-location">
                    <option value="" disabled selected>Select location</option>
                    <!-- Will be populated -->
                </select>
            </div>
            <div class="col-3">
                <select class="form-select dropoff-cargo-type">
                    <!-- Will be populated -->
                </select>
            </div>
            <div class="col-3">
                <input type="number" class="form-control dropoff-cargo-amount" min="1" value="5" placeholder="SCU">
            </div>
            <div class="col-1 d-flex align-items-center justify-content-end">
                <button class="btn btn-outline-danger remove-dropoff-btn" type="button">✕</button>
            </div>
        </div>
    `;
    
    // Add to the container first so the selects are in the DOM
    dropoffLocations.appendChild(template);
    
    // Now populate the dropoff location select
    const locationSelect = template.querySelector('.dropoff-location');
    updateLocationSelect(locationSelect);
    
    // Populate cargo type dropdown
    const cargoTypeSelect = template.querySelector('.dropoff-cargo-type');
    populateCargoTypeSelect(cargoTypeSelect);
    
    // Ensure cargo type dropdown has a default selection
    if (cargoTypeSelect.options.length > 0) {
        cargoTypeSelect.value = cargoTypeSelect.options[0].value;
    }
    
    // Add event listener for the remove button
    const removeBtn = template.querySelector('.remove-dropoff-btn');
    removeBtn.addEventListener('click', function() {
        template.remove();
        updateTotalCargoDisplay(missionItem);
    });
    
    // Add event listener for cargo amount changes
    const cargoAmountInput = template.querySelector('.dropoff-cargo-amount');
    cargoAmountInput.addEventListener('input', function() {
        updateTotalCargoDisplay(missionItem);
    });
    
    // Update total cargo display
    updateTotalCargoDisplay(missionItem);
}

/**
 * Update the total cargo display for a mission
 */
function updateTotalCargoDisplay(missionItem) {
    const dropoffItems = missionItem.querySelectorAll('.dropoff-item');
    let totalCargo = 0;
    
    dropoffItems.forEach(dropoffItem => {
        const cargoAmount = parseFloat(dropoffItem.querySelector('.dropoff-cargo-amount').value || 0);
        totalCargo += cargoAmount;
    });
    
    const totalCargoDisplay = missionItem.querySelector('.total-cargo-display');
    totalCargoDisplay.textContent = `${totalCargo} SCU`;
}

/**
 * Calculate route based on input values
 */
function calculateRoute() {
    const shipSelect = document.getElementById('ship-select');
    const shipId = shipSelect.value;
    
    if (!shipId) {
        alert('Please select a ship');
        return;
    }
    
    // Clear any previous route progress
    localStorage.removeItem('routeProgress');
    
    // Get all mission items
    const missionItems = document.querySelectorAll('.mission-item');
    const missions = [];
    
    missionItems.forEach(missionItem => {
        const pickupLocation = missionItem.querySelector('.pickup-location').value;
        const missionPayout = parseFloat(missionItem.querySelector('.mission-payout').value || 0);
        
        // Get all dropoff locations for this mission
        const dropoffItems = missionItem.querySelectorAll('.dropoff-item');
        const dropoffs = [];
        const dropoffCargoTypes = [];
        const dropoffCargoAmounts = [];
        
        dropoffItems.forEach(dropoffItem => {
            const dropoffLocation = dropoffItem.querySelector('.dropoff-location').value;
            const dropoffCargoType = dropoffItem.querySelector('.dropoff-cargo-type').value;
            const dropoffCargoAmount = parseFloat(dropoffItem.querySelector('.dropoff-cargo-amount').value || 0);
            
            if (dropoffLocation && dropoffLocation !== pickupLocation) {
                dropoffs.push(dropoffLocation);
                dropoffCargoTypes.push(dropoffCargoType);
                dropoffCargoAmounts.push(dropoffCargoAmount);
            }
        });
        
        // Calculate total cargo amount by summing individual dropoff amounts
        const totalCargoAmount = dropoffCargoAmounts.reduce((sum, amount) => sum + amount, 0);
        
        // Validate mission data
        if (!pickupLocation || dropoffs.length === 0 || totalCargoAmount <= 0) {
            return; // Skip invalid missions
        }
        
        // Add mission to the list - use first dropoff cargo type as the main cargo type
        missions.push({
            pickup: pickupLocation,
            dropoffs: dropoffs,
            cargo_scu: totalCargoAmount,
            cargo_type: dropoffCargoTypes[0] || 'Medical Supplies', // Default to Medical Supplies if no cargo type
            dropoff_cargo_types: dropoffCargoTypes,
            dropoff_cargo_amounts: dropoffCargoAmounts,
            payout: missionPayout
        });
    });
    
    if (missions.length === 0) {
        alert('Please add at least one mission');
        return;
    }
    
    // Send the request to the server
    fetch('/api/optimize', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ship_id: shipId,
            missions: missions
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.error) {
            alert('Error: ' + data.error);
            return;
        }
        
        // Show the results
        displayRouteResults(data);
        
        // Draw the route on the map
        drawRouteOnMap(data.route);
    })
    .catch(error => {
        console.error('Error calculating route:', error);
        alert('Error calculating route. Please try again.');
    });
}

/**
 * Display the route results in the UI
 */
function displayRouteResults(data) {
    // Show the results panel
    const resultsPanel = document.getElementById('route-results');
    resultsPanel.classList.remove('d-none');
    
    // Update summary
    document.getElementById('total-distance').textContent = formatDistance(data.total_distance);
    document.getElementById('stop-count').textContent = data.route.length;
    document.getElementById('total-payout').textContent = formatCurrency(data.total_payout);
    
    // Update route steps
    const stepsContainer = document.getElementById('route-steps');
    stepsContainer.innerHTML = '';
    
    // Add each step
    for (let i = 0; i < data.route.length; i++) {
        const location = data.route[i];
        const action = data.mission_order[i - 1] || 'Start';
        const cargo = data.cargo_at_each_step[i];
        
        const li = document.createElement('li');
        li.dataset.stepIndex = i;
        
        // If we have cargo types data, show them
        if (data.cargo_types_at_steps && data.cargo_types_at_steps[i]) {
            const cargoTypes = data.cargo_types_at_steps[i];
            let cargoTypesText = '';
            
            if (Object.keys(cargoTypes).length > 0) {
                cargoTypesText = ' - Cargo: ';
                for (const [type, amount] of Object.entries(cargoTypes)) {
                    cargoTypesText += `${type} (${amount} SCU), `;
                }
                cargoTypesText = cargoTypesText.slice(0, -2); // Remove last comma and space
            } else {
                cargoTypesText = ' - No cargo';
            }
            
            li.textContent = `${location} - ${action} - Total: ${cargo} SCU${cargoTypesText}`;
        } else {
            li.textContent = `${location} - ${action} - Cargo: ${cargo} SCU`;
        }
        
        stepsContainer.appendChild(li);
    }
    
    // Create the flowchart
    createRouteFlowchart(data);
    
    // Load any saved progress
    setTimeout(loadRouteProgress, 100);
}

/**
 * Draw the route on the map
 */
function drawRouteOnMap(routeLocations) {
    // Remove previous route if any
    if (routePolyline) {
        map.removeLayer(routePolyline);
    }
    
    // Collect coordinates for the route
    const routePoints = [];
    
    routeLocations.forEach(locationName => {
        const location = locations.find(loc => loc.name === locationName);
        if (location) {
            // Note: LeafletJS uses [latitude, longitude] format
            // In our case, we're using [z, x] to match the coordinate system
            routePoints.push([location.coordinates[1], location.coordinates[0]]);
        }
    });
    
    // Create a polyline for the route
    routePolyline = L.polyline(routePoints, {
        color: '#4ab6ff',
        weight: 3,
        opacity: 0.8,
        dashArray: '5, 10'
    }).addTo(map);
    
    // Add arrow decorations (direction indicators)
    addRouteArrows(routePoints);
    
    // Highlight locations in the route
    highlightRouteLocations(routeLocations);
    
    // Fit the map to show the entire route
    map.fitBounds(routePolyline.getBounds(), {
        padding: [50, 50]
    });
}

/**
 * Add arrows to indicate direction of travel on the route
 */
function addRouteArrows(routePoints) {
    // This is a simplified version - in a real app you would use a plugin
    // or create SVG markers at midpoints of each route segment
    for (let i = 0; i < routePoints.length - 1; i++) {
        const start = routePoints[i];
        const end = routePoints[i + 1];
        
        // Calculate midpoint for arrow
        const midX = (start[1] + end[1]) / 2;
        const midY = (start[0] + end[0]) / 2;
        
        // Create a small marker at the midpoint
        L.circleMarker([midY, midX], {
            radius: 2,
            color: '#ffffff',
            fillColor: '#4ab6ff',
            fillOpacity: 1
        }).addTo(map);
    }
}

/**
 * Highlight locations that are part of the route
 */
function highlightRouteLocations(routeLocations) {
    // Reset all markers first
    Object.values(locationMarkers).forEach(marker => {
        marker.setStyle({
            color: '#ffffff',
            weight: 1
        });
    });
    
    // Highlight markers in the route
    routeLocations.forEach(locationName => {
        const marker = locationMarkers[locationName];
        if (marker) {
            marker.setStyle({
                color: '#ff9900',
                weight: 2
            });
            
            // Bring to front
            marker.bringToFront();
        }
    });
}

/**
 * Format distance for display
 */
function formatDistance(distance) {
    if (!distance) return '0 km';
    
    // Convert from meters to km or AU as appropriate
    if (distance < 1000000) {
        return Math.round(distance / 1000).toLocaleString() + ' km';
    } else {
        return (distance / 149597870700).toFixed(2).toLocaleString() + ' AU';
    }
}

/**
 * Format a number as currency
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 0
    }).format(amount);
} 