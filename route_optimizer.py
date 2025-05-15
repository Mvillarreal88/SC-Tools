"""
Route optimization for Star Citizen cargo missions.
"""
import json
import networkx as nx
import numpy as np
from typing import List, Dict, Tuple, Any

# Constants
DEFAULT_SHIP_CAPACITY = 168  # Constellation Taurus cargo capacity in SCU

class CargoMission:
    """Represents a cargo mission with pickup, dropoff(s), cargo amount and cargo type."""
    
    def __init__(self, mission_id: str, pickup: str, dropoffs: List[str], cargo_scu: float, 
                 cargo_type: str = "General", dropoff_cargo_types: List[str] = None,
                 dropoff_cargo_amounts: List[float] = None, payout: float = 0.0, description: str = ""):
        self.mission_id = mission_id
        self.pickup = pickup
        # Support multiple dropoffs (convert string to list if only one provided)
        self.dropoffs = [dropoffs] if isinstance(dropoffs, str) else dropoffs
        self.cargo_scu = cargo_scu
        self.cargo_type = cargo_type  # Default cargo type
        
        # Handle cargo types for each dropoff
        if dropoff_cargo_types is None:
            # If not specified, use the same cargo type for all dropoffs
            self.dropoff_cargo_types = [cargo_type] * len(self.dropoffs)
        else:
            # Make sure we have the right number of cargo types
            if len(dropoff_cargo_types) < len(self.dropoffs):
                # Fill in missing types with the default
                self.dropoff_cargo_types = dropoff_cargo_types + [cargo_type] * (len(self.dropoffs) - len(dropoff_cargo_types))
            else:
                self.dropoff_cargo_types = dropoff_cargo_types[:len(self.dropoffs)]
        
        # Handle cargo amounts for each dropoff
        if dropoff_cargo_amounts is None:
            # If not specified, distribute cargo evenly among dropoffs
            amount_per_dropoff = self.cargo_scu / len(self.dropoffs)
            self.dropoff_cargo_amounts = [amount_per_dropoff] * len(self.dropoffs)
        else:
            # Make sure we have the right number of amounts
            if len(dropoff_cargo_amounts) < len(self.dropoffs):
                # Distribute remaining cargo evenly among remaining dropoffs
                total_specified = sum(dropoff_cargo_amounts)
                remaining = max(0, self.cargo_scu - total_specified)
                remaining_dropoffs = len(self.dropoffs) - len(dropoff_cargo_amounts)
                amount_per_remaining = remaining / remaining_dropoffs if remaining_dropoffs > 0 else 0
                self.dropoff_cargo_amounts = dropoff_cargo_amounts + [amount_per_remaining] * remaining_dropoffs
            else:
                self.dropoff_cargo_amounts = dropoff_cargo_amounts[:len(self.dropoffs)]
                
        self.payout = payout  # Mission payout in aUEC
        self.description = description
        self.completed = False
        self.current_dropoff_index = 0  # Track which dropoff we're going to next
    
    def get_next_dropoff(self) -> str:
        """Get the next dropoff location to visit."""
        if self.current_dropoff_index < len(self.dropoffs):
            return self.dropoffs[self.current_dropoff_index]
        return None
    
    def get_current_cargo_type(self) -> str:
        """Get the cargo type for the current dropoff."""
        if self.current_dropoff_index < len(self.dropoff_cargo_types):
            return self.dropoff_cargo_types[self.current_dropoff_index]
        return self.cargo_type

    def get_current_cargo_amount(self) -> float:
        """Get the cargo amount for the current dropoff."""
        if self.current_dropoff_index < len(self.dropoff_cargo_amounts):
            return self.dropoff_cargo_amounts[self.current_dropoff_index]
        # Fallback to evenly distributed cargo if somehow missing
        return self.cargo_scu / len(self.dropoffs) if len(self.dropoffs) > 0 else 0
        
    def advance_dropoff(self):
        """Move to the next dropoff location."""
        self.current_dropoff_index += 1
        return self.current_dropoff_index < len(self.dropoffs)
    
    def is_complete(self) -> bool:
        """Check if all dropoffs have been completed."""
        return self.current_dropoff_index >= len(self.dropoffs)
    
    def __repr__(self):
        dropoff_info = []
        for i, dropoff in enumerate(self.dropoffs):
            cargo_type = self.dropoff_cargo_types[i] if i < len(self.dropoff_cargo_types) else self.cargo_type
            cargo_amount = self.dropoff_cargo_amounts[i] if i < len(self.dropoff_cargo_amounts) else 0
            dropoff_info.append(f"{dropoff} ({cargo_type}, {cargo_amount} SCU)")
        
        dropoff_str = " → ".join(dropoff_info)
        return f"Mission({self.mission_id}: {self.pickup} → [{dropoff_str}], {self.cargo_scu} SCU total, {self.payout} aUEC)"


class RouteOptimizer:
    """Optimizes routes for cargo missions."""
    
    def __init__(self, ship_capacity: float = DEFAULT_SHIP_CAPACITY):
        self.ship_capacity = ship_capacity
        self.locations = []
        self.distance_matrix = None
        self.location_indices = {}
        self.load_location_data()
    
    def load_location_data(self):
        """Load location data from saved files."""
        try:
            with open('data/locations.json', 'r') as f:
                self.locations = json.load(f)
            
            with open('data/distance_matrix.json', 'r') as f:
                distance_data = json.load(f)
                self.location_indices = {loc: i for i, loc in enumerate(distance_data['locations'])}
                self.distance_matrix = distance_data['distances']
            
            print(f"Loaded {len(self.locations)} locations with distance matrix")
        except FileNotFoundError:
            print("Location data not found. Run data_fetcher.py first.")
    
    def get_distance(self, location_a: str, location_b: str) -> float:
        """Get the distance between two locations."""
        if location_a == location_b:
            return 0
        
        try:
            idx_a = self.location_indices.get(location_a)
            idx_b = self.location_indices.get(location_b)
            
            if idx_a is None or idx_b is None:
                print(f"Warning: Location not found in distance matrix: {location_a} or {location_b}")
                return float('inf')
            
            return self.distance_matrix[idx_a][idx_b]
        except (KeyError, IndexError, TypeError) as e:
            print(f"Error calculating distance between {location_a} and {location_b}: {e}")
            return float('inf')
    
    def optimize_route(self, missions: List[CargoMission], start_location: str) -> Dict[str, Any]:
        """
        Optimize the route for a set of cargo missions.
        
        Returns a dictionary with:
        - route: list of locations to visit
        - mission_order: the order in which missions are completed
        - cargo_at_each_step: the cargo load at each step
        - cargo_types_at_steps: the cargo types at each step
        - total_distance: the total distance traveled
        - total_payout: the total payout from all completed missions
        """
        if not missions:
            return {"error": "No missions provided"}
        
        if not self.locations or not self.distance_matrix:
            return {"error": "Location data not loaded"}
        
        # Create a graph of all locations
        G = nx.DiGraph()
        
        # Validate all locations exist in our data
        all_locations = set([start_location])
        invalid_locations = []
        
        for mission in missions:
            all_locations.add(mission.pickup)
            for dropoff in mission.dropoffs:
                all_locations.add(dropoff)
        
        # Check all locations are valid
        for loc in all_locations:
            if loc not in self.location_indices:
                invalid_locations.append(loc)
        
        if invalid_locations:
            return {
                "error": f"Invalid locations in request: {', '.join(invalid_locations)}",
                "valid_locations": list(self.location_indices.keys())
            }
        
        # Add all unique locations
        for loc in all_locations:
            G.add_node(loc)
        
        # Add edges with distances
        for loc_a in all_locations:
            for loc_b in all_locations:
                if loc_a != loc_b:
                    distance = self.get_distance(loc_a, loc_b)
                    G.add_edge(loc_a, loc_b, weight=distance)
        
        # Now we need to solve a problem similar to the Vehicle Routing Problem
        # For each mission, we need to visit the pickup before any of the dropoffs
        
        # Start with a greedy approach, considering cargo capacity
        current_location = start_location
        current_cargo = 0
        route = [current_location]
        mission_order = []
        cargo_at_steps = [0]
        total_distance = 0
        total_payout = 0.0  # Track the total payout
        cargo_types_at_steps = [{}]  # Track cargo types at each step
        
        # Make a copy of missions to track which ones are pending
        pending_missions = missions.copy()
        completed_missions = []
        
        # Keep track of missions that have been picked up but not dropped off
        in_progress_missions = []
        
        # Continue until all missions are completed
        while pending_missions or in_progress_missions:
            best_option = None
            best_distance = float('inf')
            
            # Consider picking up any pending mission
            for mission in pending_missions:
                if current_cargo + mission.cargo_scu <= self.ship_capacity:
                    distance = self.get_distance(current_location, mission.pickup)
                    if distance < best_distance:
                        best_distance = distance
                        best_option = ("pickup", mission)
            
            # Consider dropping off any in-progress mission
            for mission in in_progress_missions:
                next_dropoff = mission.get_next_dropoff()
                if next_dropoff:
                    distance = self.get_distance(current_location, next_dropoff)
                    if distance < best_distance:
                        best_distance = distance
                        best_option = ("dropoff", mission)
            
            # If no valid option, it means we can't complete all missions with the given capacity
            if best_option is None:
                return {
                    "error": "Cannot complete all missions with the given ship capacity",
                    "route_so_far": route,
                    "completed_missions": completed_missions,
                    "remaining_missions": pending_missions + in_progress_missions
                }
            
            # Execute the best option
            action, mission = best_option
            if action == "pickup":
                pending_missions.remove(mission)
                in_progress_missions.append(mission)
                current_location = mission.pickup
                current_cargo += mission.cargo_scu
                route.append(current_location)
                cargo_at_steps.append(current_cargo)
                
                # Track cargo types
                current_cargo_types = cargo_types_at_steps[-1].copy()
                if mission.cargo_type in current_cargo_types:
                    current_cargo_types[mission.cargo_type] += mission.cargo_scu
                else:
                    current_cargo_types[mission.cargo_type] = mission.cargo_scu
                cargo_types_at_steps.append(current_cargo_types)
                
                mission_order.append(f"Pickup {mission.mission_id} - {mission.cargo_type}")
                total_distance += best_distance
            else:  # dropoff
                dropoff_location = mission.get_next_dropoff()
                current_location = dropoff_location
                # Get the cargo type for this specific dropoff
                current_cargo_type = mission.get_current_cargo_type()
                
                # Use the specific cargo amount for this dropoff
                cargo_for_dropoff = mission.get_current_cargo_amount()
                current_cargo -= cargo_for_dropoff
                route.append(current_location)
                cargo_at_steps.append(current_cargo)
                
                # Track cargo types
                current_cargo_types = cargo_types_at_steps[-1].copy()
                if current_cargo_type in current_cargo_types:
                    current_cargo_types[current_cargo_type] = max(0, current_cargo_types[current_cargo_type] - cargo_for_dropoff)
                    if current_cargo_types[current_cargo_type] == 0:
                        del current_cargo_types[current_cargo_type]
                cargo_types_at_steps.append(current_cargo_types)
                
                mission_order.append(f"Dropoff {mission.mission_id} at {dropoff_location} - {current_cargo_type}")
                total_distance += best_distance
                
                # Check if mission is complete after this dropoff
                has_more_dropoffs = mission.advance_dropoff()
                if not has_more_dropoffs:
                    in_progress_missions.remove(mission)
                    completed_missions.append(mission)
                    # Add the mission payout when it's complete
                    total_payout += mission.payout
        
        return {
            "route": route,
            "mission_order": mission_order,
            "cargo_at_each_step": cargo_at_steps,
            "cargo_types_at_steps": cargo_types_at_steps,
            "total_distance": total_distance,
            "total_payout": total_payout,
            "completed_missions": [m.mission_id for m in completed_missions]
        }


def calculate_route(missions: List[Dict[str, Any]], start_location: str, ship_capacity: float = DEFAULT_SHIP_CAPACITY) -> Dict[str, Any]:
    """
    Calculate the optimal route for the given missions.
    
    Args:
        missions: List of mission dictionaries with pickup, dropoffs, cargo_scu, cargo_type and optional payout
        start_location: The starting location
        ship_capacity: The cargo capacity of the ship (default: Constellation Taurus)
        
    Returns:
        Dict with optimized route information
    """
    optimizer = RouteOptimizer(ship_capacity=ship_capacity)
    
    # Convert mission dictionaries to CargoMission objects
    cargo_missions = []
    for i, mission in enumerate(missions):
        mission_id = mission.get("id", f"M{i+1}")
        
        # Support either single dropoff or multiple dropoffs
        dropoffs = mission.get("dropoffs", [])
        if not dropoffs and "dropoff" in mission:
            dropoffs = [mission["dropoff"]]

        # Get mission payout (default to 0 if not provided)
        payout = float(mission.get("payout", 0.0))
        
        # Get cargo type (default to "General" if not provided)
        cargo_type = mission.get("cargo_type", "General")
        
        # Get cargo types for each dropoff
        dropoff_cargo_types = mission.get("dropoff_cargo_types", [])
        
        # Get cargo amounts for each dropoff
        dropoff_cargo_amounts = mission.get("dropoff_cargo_amounts", [])
        
        # Ensure we have valid dropoff_cargo_amounts
        if dropoff_cargo_amounts is None:
            dropoff_cargo_amounts = []
            
        # Convert string amounts to floats if needed
        try:
            dropoff_cargo_amounts = [float(amount) for amount in dropoff_cargo_amounts]
        except (ValueError, TypeError):
            # If there's any error in conversion, set to empty list and let 
            # CargoMission handle the distribution
            print(f"Warning: Could not convert cargo amounts to floats: {dropoff_cargo_amounts}")
            dropoff_cargo_amounts = []
            
        # Ensure cargo_scu is valid
        try:
            cargo_scu = float(mission["cargo_scu"])
        except (ValueError, TypeError, KeyError):
            # If there's an issue with the cargo_scu value, use sum of dropoff amounts
            cargo_scu = sum(dropoff_cargo_amounts) if dropoff_cargo_amounts else 0
            print(f"Warning: Using calculated cargo_scu: {cargo_scu}")
            
        cargo_missions.append(
            CargoMission(
                mission_id=mission_id,
                pickup=mission["pickup"],
                dropoffs=dropoffs,
                cargo_scu=cargo_scu,
                cargo_type=cargo_type,
                dropoff_cargo_types=dropoff_cargo_types,
                dropoff_cargo_amounts=dropoff_cargo_amounts,
                payout=payout,
                description=mission.get("description", "")
            )
        )
    
    return optimizer.optimize_route(cargo_missions, start_location)


if __name__ == "__main__":
    # Example usage
    test_missions = [
        {
            "id": "1", 
            "pickup": "Port Olisar", 
            "dropoffs": ["Area18", "Lorville"], 
            "cargo_scu": 50, 
            "cargo_type": "Medical Supplies",
            "dropoff_cargo_types": ["Stims", "Medpens"],
            "payout": 15000
        },
        {
            "id": "2", 
            "pickup": "Area18", 
            "dropoffs": ["Lorville"], 
            "cargo_scu": 70, 
            "cargo_type": "Titanium",
            "payout": 22000
        },
        {
            "id": "3", 
            "pickup": "Lorville", 
            "dropoffs": ["Port Olisar"], 
            "cargo_scu": 60, 
            "cargo_type": "Agricultural Supplies",
            "payout": 18000
        }
    ]
    result = calculate_route(test_missions, "Port Olisar")
    print(json.dumps(result, indent=2)) 