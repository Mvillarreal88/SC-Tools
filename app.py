"""
Star Citizen Cargo Route Optimizer - Main Flask Application
"""
import os
import json
from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS

from data_fetcher import download_and_process_map_data
from route_optimizer import calculate_route, DEFAULT_SHIP_CAPACITY

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)  # Enable CORS for all routes

# Ensure data directory exists
if not os.path.exists('data'):
    os.makedirs('data')

# Always reload location data on startup to ensure it's fresh
print("Initializing location data...")
download_and_process_map_data()


@app.route('/')
def index():
    """Serve the main application page."""
    return render_template('index.html')


@app.route('/api/locations')
def get_locations():
    """Get the list of available locations."""
    try:
        with open('data/simplified_locations.json', 'r') as f:
            locations = json.load(f)
        return jsonify(locations)
    except FileNotFoundError:
        # If the file doesn't exist, regenerate the data
        print("Location data not found. Regenerating...")
        download_and_process_map_data()
        
        # Try again after regenerating
        try:
            with open('data/simplified_locations.json', 'r') as f:
                locations = json.load(f)
            return jsonify(locations)
        except FileNotFoundError:
            return jsonify({"error": "Failed to generate location data"}), 500


@app.route('/api/ships')
def get_ships():
    """Get the list of available ships with cargo capacities."""
    ships = [
        {"id": "taurus", "name": "Constellation Taurus", "cargo_capacity": 168},
        {"id": "freelancer", "name": "Freelancer", "cargo_capacity": 66},
        {"id": "caterpillar", "name": "Caterpillar", "cargo_capacity": 576},
        {"id": "cutlass_black", "name": "Cutlass Black", "cargo_capacity": 46},
        {"id": "c2_hercules", "name": "C2 Hercules", "cargo_capacity": 696},
    ]
    return jsonify(ships)


@app.route('/api/optimize', methods=['POST'])
def optimize_route():
    """Optimize a cargo route for the given missions."""
    data = request.json
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    missions = data.get('missions', [])
    start_location = data.get('start_location')
    ship_id = data.get('ship_id', 'taurus')
    
    # Set ship capacity based on selected ship (default to Taurus)
    ship_capacity = DEFAULT_SHIP_CAPACITY
    if ship_id != 'taurus':
        # In a real app, get this from a database or config
        ships = {
            "freelancer": 66,
            "caterpillar": 576,
            "cutlass_black": 46,
            "c2_hercules": 696,
        }
        ship_capacity = ships.get(ship_id, DEFAULT_SHIP_CAPACITY)
    
    if not missions:
        return jsonify({"error": "No missions provided"}), 400
    
    if not start_location:
        return jsonify({"error": "No start location provided"}), 400
    
    # Validate missions
    for mission in missions:
        if 'pickup' not in mission or 'cargo_scu' not in mission:
            return jsonify({"error": "Invalid mission format: missing pickup or cargo_scu"}), 400
            
        # Check for dropoffs (new format) or dropoff (old format)
        if 'dropoffs' not in mission and 'dropoff' not in mission:
            return jsonify({"error": "Invalid mission format: missing dropoff location(s)"}), 400
            
        # Ensure dropoffs is a list
        if 'dropoffs' in mission and not isinstance(mission['dropoffs'], list):
            return jsonify({"error": "Invalid mission format: dropoffs must be a list"}), 400
            
        # Ensure there's at least one dropoff
        if 'dropoffs' in mission and len(mission['dropoffs']) == 0:
            return jsonify({"error": "Invalid mission format: at least one dropoff location is required"}), 400
    
    result = calculate_route(missions, start_location, ship_capacity)
    return jsonify(result)


@app.route('/static/<path:path>')
def serve_static(path):
    """Serve static files."""
    return send_from_directory('static', path)


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 