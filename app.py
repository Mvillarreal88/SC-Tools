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

# Ensure data directory exists and contains the required files
def initialize_data():
    """Initialize data files if they don't exist."""
    if not os.path.exists('data'):
        print("Creating data directory...")
        os.makedirs('data', exist_ok=True)
    
    # Check if location data files exist
    if not (os.path.exists('data/simplified_locations.json') and
            os.path.exists('data/locations.json') and
            os.path.exists('data/distance_matrix.json')):
        print("Initializing location data...")
        download_and_process_map_data()
    else:
        print("Location data already exists.")

# Initialize data at startup
initialize_data()


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
            
        # Add debug info
        print(f"DEBUG: Serving {len(locations)} locations to client")
        # Check for specific locations
        location_names = [loc['name'] for loc in locations]
        print("DEBUG: Riker Memorial Spaceport in API response:", "Riker Memorial Spaceport" in location_names)
        print("DEBUG: Samson & Son's Salvage Center in API response:", "Samson & Son's Salvage Center" in location_names)
        print("DEBUG: CRU-L4 Shallow Fields Station in API response:", "CRU-L4 Shallow Fields Station" in location_names)
            
        return jsonify(locations)
    except FileNotFoundError:
        # If the file doesn't exist, regenerate the data
        print("Location data not found. Regenerating...")
        try:
            data = download_and_process_map_data()
            return jsonify(data['simplified'])
        except Exception as e:
            print(f"Error generating location data: {e}")
            return jsonify({"error": f"Failed to generate location data: {str(e)}"}), 500
    except Exception as e:
        print(f"Error loading location data: {e}")
        return jsonify({"error": f"Error loading location data: {str(e)}"}), 500


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
    try:
        data = request.json
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        missions = data.get('missions', [])
        start_location = data.get('start_location')
        ship_id = data.get('ship_id', 'taurus')
        
        print(f"Received optimize request: {json.dumps(data)}")
        
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
        
        # If no start_location provided, use the first pickup location
        if not start_location and missions:
            start_location = missions[0]['pickup']
        
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
    except Exception as e:
        import traceback
        error_msg = f"Error processing route optimization: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        return jsonify({"error": str(e)}), 500


@app.route('/static/<path:path>')
def serve_static(path):
    """Serve static files."""
    return send_from_directory('static', path)


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000) 