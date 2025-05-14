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
    addMission(); // Add one mission by default
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
    fetch('/api/locations')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(`Loaded ${data.length} locations from server`);
            locations = data;
            populateLocationSelects();
            addLocationsToMap();
        })
        .catch(error => {
            console.error('Error loading location data:', error);
            alert('Error loading location data. Please refresh the page and try again.');
        });
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
    
    // Add location options
    locations.forEach(location => {
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
 * Set up event listeners
 */
function setupEventListeners() {
    // Add mission button
    document.getElementById('add-mission-btn').addEventListener('click', addMission);
    
    // Calculate route button
    document.getElementById('calculate-route-btn').addEventListener('click', calculateRoute);
    
    // Ship select
    document.getElementById('ship-select').addEventListener('change', function() {
        const shipId = this.value;
        const capacity = ships[shipId].capacity;
        document.getElementById('cargo-capacity').textContent = `${capacity} SCU`;
    });
    
    // Add event delegation for mission removal and adding dropoffs
    document.getElementById('missions-container').addEventListener('click', function(e) {
        // Handle mission removal
        if (e.target.classList.contains('remove-mission-btn')) {
            const missionItem = e.target.closest('.mission-item');
            if (missionItem) {
                missionItem.remove();
                updateMissionNumbers();
            }
        }
        
        // Handle adding dropoff locations
        if (e.target.classList.contains('add-dropoff-btn')) {
            const missionItem = e.target.closest('.mission-item');
            if (missionItem) {
                addDropoffLocation(missionItem);
            }
        }
        
        // Handle removing dropoff locations
        if (e.target.classList.contains('remove-dropoff-btn')) {
            const dropoffItem = e.target.closest('.dropoff-item');
            if (dropoffItem && dropoffItem.parentNode.querySelectorAll('.dropoff-item').length > 1) {
                dropoffItem.remove();
            }
        }
    });
}

/**
 * Add a new mission to the form
 */
function addMission() {
    // Get the template
    const template = document.getElementById('mission-template');
    const clone = document.importNode(template.content, true);
    
    // Get the current mission count
    const missionCount = document.querySelectorAll('.mission-item').length + 1;
    
    // Update the mission number
    clone.querySelector('.mission-number').textContent = `Mission ${missionCount}`;
    
    // Add location options
    const pickupSelect = clone.querySelector('.pickup-location');
    
    // Populate selects with locations
    if (locations.length > 0) {
        updateLocationSelect(pickupSelect);
    }
    
    // Populate cargo type options
    const cargoTypeSelect = clone.querySelector('.cargo-type');
    populateCargoTypeSelect(cargoTypeSelect);
    
    // Add the mission to the container
    document.getElementById('missions-container').appendChild(clone);
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
    
    // Set default selection
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
            <div class="col-7">
                <select class="form-select dropoff-location">
                    <option value="" disabled selected>Select location</option>
                    <!-- Will be populated -->
                </select>
            </div>
            <div class="col-5 d-flex">
                <select class="form-select dropoff-cargo-type">
                    <!-- Will be populated -->
                </select>
                <button class="btn btn-outline-danger remove-dropoff-btn ms-1" type="button">✕</button>
            </div>
        </div>
    `;
    
    // Populate the new select with locations
    const locationSelect = template.querySelector('.dropoff-location');
    updateLocationSelect(locationSelect);
    
    // Populate cargo type dropdown
    const cargoTypeSelect = template.querySelector('.dropoff-cargo-type');
    populateCargoTypeSelect(cargoTypeSelect);
    
    // Add to the container
    dropoffLocations.appendChild(template);
}

/**
 * Calculate the optimal route
 */
function calculateRoute() {
    // Get the starting location
    const startLocation = document.getElementById('start-location').value;
    if (!startLocation) {
        alert('Please select a starting location');
        return;
    }
    
    // Get the selected ship
    const shipId = document.getElementById('ship-select').value;
    
    // Get all missions
    const missionElements = document.querySelectorAll('.mission-item');
    const missions = [];
    
    // Validate and collect mission data
    for (let i = 0; i < missionElements.length; i++) {
        const elem = missionElements[i];
        
        const pickup = elem.querySelector('.pickup-location').value;
        const cargoType = elem.querySelector('.cargo-type').value || 'Medical Supplies';
        const cargoScu = parseFloat(elem.querySelector('.cargo-amount').value);
        const payout = parseFloat(elem.querySelector('.mission-payout').value) || 0;
        
        // Collect all dropoff locations and their cargo types
        const dropoffs = [];
        const dropoffCargoTypes = [];
        const dropoffItems = elem.querySelectorAll('.dropoff-item');
        
        for (let j = 0; j < dropoffItems.length; j++) {
            const item = dropoffItems[j];
            const dropoffLocation = item.querySelector('.dropoff-location').value;
            let dropoffCargoType = item.querySelector('.dropoff-cargo-type').value;
            
            if (dropoffLocation) {
                dropoffs.push(dropoffLocation);
                // If dropoff cargo type is empty, use the main cargo type
                if (!dropoffCargoType) {
                    dropoffCargoType = cargoType;
                }
                dropoffCargoTypes.push(dropoffCargoType);
            }
        }
        
        if (!pickup || dropoffs.length === 0 || isNaN(cargoScu) || cargoScu <= 0) {
            alert(`Mission ${i + 1} has incomplete or invalid data`);
            return;
        }
        
        missions.push({
            id: `M${i + 1}`,
            pickup: pickup,
            dropoffs: dropoffs,
            cargo_scu: cargoScu,
            cargo_type: cargoType,
            dropoff_cargo_types: dropoffCargoTypes,
            payout: payout
        });
    }
    
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
            start_location: startLocation,
            ship_id: shipId,
            missions: missions
        })
    })
    .then(response => response.json())
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
    // Convert from meters to km or AU as appropriate
    if (distance < 1000000) {
        return Math.round(distance / 1000) + ' km';
    } else {
        return (distance / 149597870700).toFixed(2) + ' AU';
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