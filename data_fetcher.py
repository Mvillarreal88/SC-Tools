"""
Star Citizen location data fetcher and processor.
This script downloads and processes Star Citizen locations for the Stanton system.
"""
import json
import os
import requests
import pandas as pd

# Define the Stanton system locations (coordinates are approximate/fictional)
# In a real implementation, we would try to fetch this from Star Citizen API or sources
STANTON_LOCATIONS = {
    # Main planets and moons with approximate coordinates
    "ArcCorp": {"type": "planet", "x": 18371812, "y": 0, "z": 2652349},
    "Area18": {"type": "landing_zone", "parent": "ArcCorp", "x": 18361812, "y": 10000, "z": 2662349},
    "Baijini Point": {"type": "station", "parent": "ArcCorp", "x": 18375812, "y": 50000, "z": 2692349},
    
    "Crusader": {"type": "planet", "x": 0, "y": 0, "z": 0},
    "Orison": {"type": "landing_zone", "parent": "Crusader", "x": 0, "y": 5000, "z": 5000},
    "Port Olisar": {"type": "station", "parent": "Crusader", "x": 0, "y": 80000, "z": 80000},
    
    "Hurston": {"type": "planet", "x": -16550615, "y": 0, "z": -1652349},
    "Lorville": {"type": "landing_zone", "parent": "Hurston", "x": -16540615, "y": 5000, "z": -1642349},
    "Everus Harbor": {"type": "station", "parent": "Hurston", "x": -16555615, "y": 60000, "z": -1602349},
    
    "microTech": {"type": "planet", "x": 22999592, "y": 0, "z": 37919954},
    "New Babbage": {"type": "landing_zone", "parent": "microTech", "x": 22989592, "y": 5000, "z": 37929954},
    "Port Tressler": {"type": "station", "parent": "microTech", "x": 22999592, "y": 70000, "z": 37989954},
    
    # Some moons of Crusader
    "Cellin": {"type": "moon", "parent": "Crusader", "x": 300000, "y": 0, "z": 0},
    "Daymar": {"type": "moon", "parent": "Crusader", "x": 0, "y": 0, "z": 500000},
    "Yela": {"type": "moon", "parent": "Crusader", "x": -400000, "y": 0, "z": -200000},
    
    # Lagrange points
    "CRU-L1": {"type": "lagrange", "x": 5000000, "y": 0, "z": 0},
    "CRU-L5": {"type": "lagrange", "x": -2500000, "y": 0, "z": 4330127},
    "ARC-L1": {"type": "lagrange", "x": 12000000, "y": 0, "z": 1500000},
    "HUR-L1": {"type": "lagrange", "x": -12000000, "y": 0, "z": -1500000},
    "MIC-L1": {"type": "lagrange", "x": 18000000, "y": 0, "z": 30000000},
}

def download_and_process_map_data():
    """
    Either download map data from an external source or use the predefined data.
    In a real implementation, we would try to fetch this from official sources.
    """
    # Create data directory if it doesn't exist
    if not os.path.exists('data'):
        os.makedirs('data')
    
    # For now, we'll use our predefined data
    # In a real implementation, we'd make API requests for updated data
    
    # Calculate distances between locations
    locations = []
    for location_name, location_data in STANTON_LOCATIONS.items():
        locations.append({
            'name': location_name,
            'type': location_data['type'],
            'parent': location_data.get('parent', None),
            'x': location_data['x'],
            'y': location_data['y'],
            'z': location_data['z']
        })
    
    # Save the location data
    with open('data/locations.json', 'w') as f:
        json.dump(locations, f, indent=2)
    
    print(f"Saved {len(locations)} locations to data/locations.json")
    
    # Create a simplified version for the frontend
    simplified_locations = []
    for loc in locations:
        simplified_locations.append({
            'name': loc['name'],
            'type': loc['type'],
            'coordinates': [loc['x']/1000000, loc['z']/1000000]  # Simplified to 2D coordinates in millions of km
        })
    
    # Save the simplified locations data file
    with open('data/simplified_locations.json', 'w') as f:
        json.dump(simplified_locations, f, indent=2)
    
    print(f"Saved {len(simplified_locations)} simplified locations to data/simplified_locations.json")
    
    # Calculate a distance matrix for routing
    location_count = len(locations)
    distances = [[0 for _ in range(location_count)] for _ in range(location_count)]
    
    for i in range(location_count):
        for j in range(location_count):
            if i != j:
                # Euclidean distance in 3D space
                dist = ((locations[i]['x'] - locations[j]['x'])**2 + 
                        (locations[i]['y'] - locations[j]['y'])**2 + 
                        (locations[i]['z'] - locations[j]['z'])**2)**0.5
                distances[i][j] = dist
    
    # Save the distance matrix data file
    with open('data/distance_matrix.json', 'w') as f:
        json.dump({
            'locations': [loc['name'] for loc in locations],
            'distances': distances
        }, f, indent=2)
    
    print("Generated distance matrix for routing calculations")
    
    return {
        'locations': locations,
        'simplified': simplified_locations,
        'distances': {
            'locations': [loc['name'] for loc in locations],
            'matrix': distances
        }
    }

if __name__ == "__main__":
    download_and_process_map_data() 