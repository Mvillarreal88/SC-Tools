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
    # CRUSADER and moons
    "Crusader": {"type": "planet", "x": 0, "y": 0, "z": 0},
    "Orison": {"type": "landing_zone", "parent": "Crusader", "x": 0, "y": 5000, "z": 5000},
    "Port Olisar": {"type": "station", "parent": "Crusader", "x": 0, "y": 80000, "z": 80000},
    "CRU-L1 Ambitious Dream Station": {"type": "station", "parent": "Crusader", "x": 5000000, "y": 0, "z": 0},
    "Grim HEX": {"type": "station", "parent": "Crusader", "x": -200000, "y": 150000, "z": -100000},
    
    # Crusader Moons
    "Cellin": {"type": "moon", "parent": "Crusader", "x": 300000, "y": 0, "z": 0},
    "Galette Family Farms": {"type": "outpost", "parent": "Cellin", "x": 310000, "y": 5000, "z": 15000},
    "Hickes Research Outpost": {"type": "outpost", "parent": "Cellin", "x": 305000, "y": -5000, "z": 20000},
    "Terra Mills Hydro Farm": {"type": "outpost", "parent": "Cellin", "x": 295000, "y": 3000, "z": -8000},
    "Tram & Meyers Mining": {"type": "outpost", "parent": "Cellin", "x": 315000, "y": -2000, "z": 12000},
    
    "Daymar": {"type": "moon", "parent": "Crusader", "x": 0, "y": 0, "z": 500000},
    "ArcCorp Mining Area 141": {"type": "outpost", "parent": "Daymar", "x": 10000, "y": 5000, "z": 505000},
    "Bountiful Harvest Hydroponics": {"type": "outpost", "parent": "Daymar", "x": -5000, "y": 1000, "z": 510000},
    "Kudre Ore": {"type": "outpost", "parent": "Daymar", "x": 5000, "y": -3000, "z": 490000},
    "Shubin Mining Facility SCD-1": {"type": "outpost", "parent": "Daymar", "x": -8000, "y": 4000, "z": 495000},
    "Brio's Breaker Yard": {"type": "outpost", "parent": "Daymar", "x": 12000, "y": 3000, "z": 507000},
    "Nuen Waste Management": {"type": "outpost", "parent": "Daymar", "x": -7000, "y": -2000, "z": 486000},

    "Yela": {"type": "moon", "parent": "Crusader", "x": -400000, "y": 0, "z": -200000},
    "ArcCorp Mining Area 157": {"type": "outpost", "parent": "Yela", "x": -405000, "y": 3000, "z": -195000},
    "Benson Mining Outpost": {"type": "outpost", "parent": "Yela", "x": -395000, "y": -2000, "z": -205000},
    "Deakins Research Outpost": {"type": "outpost", "parent": "Yela", "x": -410000, "y": 5000, "z": -210000},
    "Jumptown": {"type": "outpost", "parent": "Yela", "x": -390000, "y": -1000, "z": -190000},
    "NT-999 XX": {"type": "outpost", "parent": "Yela", "x": -385000, "y": 2000, "z": -210000},
    "Kosso Basin": {"type": "outpost", "parent": "Yela", "x": -415000, "y": -3000, "z": -188000},
    
    # HURSTON and moons
    "Hurston": {"type": "planet", "x": -16550615, "y": 0, "z": -1652349},
    "Lorville": {"type": "landing_zone", "parent": "Hurston", "x": -16540615, "y": 5000, "z": -1642349},
    "Everus Harbor": {"type": "station", "parent": "Hurston", "x": -16555615, "y": 60000, "z": -1602349},
    "HUR-L1 Green Glade Station": {"type": "station", "parent": "Hurston", "x": -12000000, "y": 0, "z": -1500000},
    "HUR-L2 Stormbreaker Station": {"type": "station", "x": -20000000, "y": 0, "z": -1652349},
    "Teasa Spaceport": {"type": "spaceport", "parent": "Lorville", "x": -16539615, "y": 5100, "z": -1641349},
    
    # Hurston Moons
    "Aberdeen": {"type": "moon", "parent": "Hurston", "x": -16750615, "y": 0, "z": -1752349},
    "HDMS Anderson": {"type": "outpost", "parent": "Aberdeen", "x": -16755615, "y": 5000, "z": -1747349},
    "HDMS Norgaard": {"type": "outpost", "parent": "Aberdeen", "x": -16745615, "y": 3000, "z": -1757349},
    "Klescher Rehabilitation Facility": {"type": "outpost", "parent": "Aberdeen", "x": -16760615, "y": -3000, "z": -1762349},
    
    "Arial": {"type": "moon", "parent": "Hurston", "x": -16350615, "y": 0, "z": -1552349},
    "HDMS Bezdek": {"type": "outpost", "parent": "Arial", "x": -16355615, "y": 3000, "z": -1547349},
    "HDMS Lathan": {"type": "outpost", "parent": "Arial", "x": -16345615, "y": -2000, "z": -1557349},
    
    "Ita": {"type": "moon", "parent": "Hurston", "x": -16650615, "y": 0, "z": -1452349},
    "HDMS Ryder": {"type": "outpost", "parent": "Ita", "x": -16655615, "y": 5000, "z": -1447349},
    "HDMS Woodruff": {"type": "outpost", "parent": "Ita", "x": -16645615, "y": -3000, "z": -1457349},
    
    "Magda": {"type": "moon", "parent": "Hurston", "x": -16450615, "y": 0, "z": -1852349},
    "HDMS Hahn": {"type": "outpost", "parent": "Magda", "x": -16455615, "y": 3000, "z": -1847349},
    "HDMS Perlman": {"type": "outpost", "parent": "Magda", "x": -16445615, "y": -2000, "z": -1857349},
    
    # ARCCORP and moons
    "ArcCorp": {"type": "planet", "x": 18371812, "y": 0, "z": 2652349},
    "Area18": {"type": "landing_zone", "parent": "ArcCorp", "x": 18361812, "y": 10000, "z": 2662349},
    "Baijini Point": {"type": "station", "parent": "ArcCorp", "x": 18375812, "y": 50000, "z": 2692349},
    "ARC-L1 Conn Station": {"type": "station", "parent": "ArcCorp", "x": 12000000, "y": 0, "z": 1500000},
    "Riker Memorial Spaceport": {"type": "spaceport", "parent": "Area18", "x": 18362812, "y": 11000, "z": 2663349},
    
    # ArcCorp Moons
    "Lyria": {"type": "moon", "parent": "ArcCorp", "x": 18571812, "y": 0, "z": 2752349},
    "Loveridge Mineral Reserve": {"type": "outpost", "parent": "Lyria", "x": 18576812, "y": 5000, "z": 2747349},
    "Humboldt Mines": {"type": "outpost", "parent": "Lyria", "x": 18566812, "y": -3000, "z": 2757349},
    "Shubin Mining Facility SAL-2": {"type": "outpost", "parent": "Lyria", "x": 18581812, "y": 2000, "z": 2762349},
    "The Orphanage": {"type": "outpost", "parent": "Lyria", "x": 18561812, "y": -5000, "z": 2742349},
    "Paradise Cove": {"type": "outpost", "parent": "Lyria", "x": 18568812, "y": 6000, "z": 2749349},
    "Dulli Research Facility": {"type": "outpost", "parent": "Lyria", "x": 18585812, "y": -4000, "z": 2755349},
    
    "Wala": {"type": "moon", "parent": "ArcCorp", "x": 18171812, "y": 0, "z": 2552349},
    "ArcCorp Mining Area 045": {"type": "outpost", "parent": "Wala", "x": 18176812, "y": 3000, "z": 2547349},
    "ArcCorp Mining Area 048": {"type": "outpost", "parent": "Wala", "x": 18166812, "y": -2000, "z": 2557349},
    "ArcCorp Mining Area 056": {"type": "outpost", "parent": "Wala", "x": 18181812, "y": 5000, "z": 2562349},
    "ArcCorp Mining Area 061": {"type": "outpost", "parent": "Wala", "x": 18161812, "y": -5000, "z": 2542349},
    "Samson & Son's Salvage Center": {"type": "outpost", "parent": "Wala", "x": 18171812, "y": 1000, "z": 2552349},
    
    # MICROTECH and moons
    "microTech": {"type": "planet", "x": 22999592, "y": 0, "z": 37919954},
    "New Babbage": {"type": "landing_zone", "parent": "microTech", "x": 22989592, "y": 5000, "z": 37929954},
    "Port Tressler": {"type": "station", "parent": "microTech", "x": 22999592, "y": 70000, "z": 37989954},
    "MIC-L1 Shallow Frontier Station": {"type": "station", "parent": "microTech", "x": 18000000, "y": 0, "z": 30000000},
    "Aspire Grand": {"type": "spaceport", "parent": "New Babbage", "x": 22988592, "y": 5500, "z": 37930954},
    
    # microTech Moons
    "Calliope": {"type": "moon", "parent": "microTech", "x": 23199592, "y": 0, "z": 38119954},
    "Rayari Deltana Research Outpost": {"type": "outpost", "parent": "Calliope", "x": 23204592, "y": 5000, "z": 38114954},
    "Shubin Mining Facility SMO-18": {"type": "outpost", "parent": "Calliope", "x": 23194592, "y": -3000, "z": 38124954},
    "Nuiqsut Research Facility": {"type": "outpost", "parent": "Calliope", "x": 23210592, "y": 4000, "z": 38110954},
    
    "Clio": {"type": "moon", "parent": "microTech", "x": 22799592, "y": 0, "z": 37719954},
    "Shubin Mining Facility SMO-13": {"type": "outpost", "parent": "Clio", "x": 22804592, "y": 3000, "z": 37714954},
    "Rayari Anvik Research Outpost": {"type": "outpost", "parent": "Clio", "x": 22794592, "y": -4000, "z": 37724954},
    "Druglab Paradise Cove": {"type": "outpost", "parent": "Clio", "x": 22809592, "y": -2000, "z": 37709954},
    
    "Euterpe": {"type": "moon", "parent": "microTech", "x": 23099592, "y": 0, "z": 37819954},
    "Shubin Mining Facility SMO-22": {"type": "outpost", "parent": "Euterpe", "x": 23104592, "y": 5000, "z": 37814954},
    "Bud's Growery": {"type": "outpost", "parent": "Euterpe", "x": 23089592, "y": -3000, "z": 37829954},
    
    # Other Rest Stops and Lagrange Points
    "CRU-L2 Shallow Fields Station": {"type": "station", "x": -5000000, "y": 0, "z": 0},
    "CRU-L3 Wide Forest Station": {"type": "station", "x": 0, "y": 0, "z": -5000000},
    "CRU-L4 Shallow Fields Station": {"type": "station", "x": 5000000, "y": 0, "z": 0},
    "CRU-L5 Beautiful Glen Station": {"type": "station", "x": -2500000, "y": 0, "z": 4330127},
    "HUR-L3 Red Festival Station": {"type": "station", "x": -16550615, "y": 0, "z": 6500000},
    "HUR-L4 Melodic Retreat Station": {"type": "station", "x": -10000000, "y": 0, "z": -10000000},
    "HUR-L5 Faithful Retreat Station": {"type": "station", "x": -21000000, "y": 0, "z": 3000000},
    "ARC-L2 Wide Forest Station": {"type": "station", "x": 24000000, "y": 0, "z": 2652349},
    "ARC-L3 Shallow Fields Station": {"type": "station", "x": 18371812, "y": 0, "z": -3500000},
    "ARC-L4 Stone Henge Station": {"type": "station", "x": 12000000, "y": 0, "z": 3500000},
    "ARC-L5 Bountiful Harvest Station": {"type": "station", "x": 22000000, "y": 0, "z": 5000000},
    "MIC-L2 Torchbearer Station": {"type": "station", "x": 28000000, "y": 0, "z": 37919954},
    "MIC-L3 Harmonious Haven Station": {"type": "station", "x": 22999592, "y": 0, "z": 32000000},
    "MIC-L4 Outpost Station": {"type": "station", "x": 18000000, "y": 0, "z": 40000000},
    "MIC-L5 Steel Hollow Station": {"type": "station", "x": 26000000, "y": 0, "z": 41000000},
}

def download_and_process_map_data():
    """
    Either download map data from an external source or use the predefined data.
    In a real implementation, we would try to fetch this from official sources.
    """
    try:
        # Create data directory if it doesn't exist
        if not os.path.exists('data'):
            os.makedirs('data')
        
        # For now, we'll use our predefined data
        # In a real implementation, we'd make API requests for updated data
        
        # Debug print to check all locations
        print("DEBUG: Total locations defined:", len(STANTON_LOCATIONS))
        print("DEBUG: Checking for specific locations:")
        print("DEBUG: Riker Memorial Spaceport in locations:", "Riker Memorial Spaceport" in STANTON_LOCATIONS)
        print("DEBUG: Samson & Son's Salvage Center in locations:", "Samson & Son's Salvage Center" in STANTON_LOCATIONS)
        print("DEBUG: CRU-L4 Shallow Fields Station in locations:", "CRU-L4 Shallow Fields Station" in STANTON_LOCATIONS)
        
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
        
        # Debug print to check which locations were processed
        processed_names = [loc['name'] for loc in locations]
        print("DEBUG: Processed locations count:", len(processed_names))
        print("DEBUG: Riker Memorial Spaceport in processed:", "Riker Memorial Spaceport" in processed_names)
        print("DEBUG: Samson & Son's Salvage Center in processed:", "Samson & Son's Salvage Center" in processed_names)
        print("DEBUG: CRU-L4 Shallow Fields Station in processed:", "CRU-L4 Shallow Fields Station" in processed_names)
        
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
        
        # Debug print to check simplified locations
        simplified_names = [loc['name'] for loc in simplified_locations]
        print("DEBUG: Simplified locations count:", len(simplified_names))
        print("DEBUG: Riker Memorial Spaceport in simplified:", "Riker Memorial Spaceport" in simplified_names)
        print("DEBUG: Samson & Son's Salvage Center in simplified:", "Samson & Son's Salvage Center" in simplified_names)
        print("DEBUG: CRU-L4 Shallow Fields Station in simplified:", "CRU-L4 Shallow Fields Station" in simplified_names)
        
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
    except Exception as e:
        print(f"Error in download_and_process_map_data: {e}")
        # Still try to return any data that might exist
        try:
            # Try to load existing simplified_locations.json
            with open('data/simplified_locations.json', 'r') as f:
                simplified = json.load(f)
            
            # Try to load existing locations.json
            with open('data/locations.json', 'r') as f:
                locations = json.load(f)
            
            # Try to load existing distance_matrix.json
            with open('data/distance_matrix.json', 'r') as f:
                distance_data = json.load(f)
            
            return {
                'locations': locations,
                'simplified': simplified,
                'distances': {
                    'locations': distance_data['locations'],
                    'matrix': distance_data['distances']
                }
            }
        except Exception as inner_e:
            print(f"Failed to load existing data: {inner_e}")
            raise e

if __name__ == "__main__":
    download_and_process_map_data() 