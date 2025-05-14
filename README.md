# Star Citizen Cargo Route Optimizer

A web-based tool for Star Citizen players to optimize cargo hauling routes by efficiently chaining multiple missions.

## Features

- Input multiple missions with pickup and dropoff locations
- Support for multiple drop-off points per mission
- Specify different cargo types for each mission and dropoff
- Track cargo capacity (Constellation Taurus - 168 SCU and other ships)
- Calculate the most efficient route between all points
- Show estimated mission payouts and total earnings
- Visualize the route on the Stanton system map
- Prevent cargo overloading

## Setup

1. Clone this repository
2. Install requirements:
   ```
   pip install -r requirements.txt
   ```
3. Run the application:
   ```
   python app.py
   ```
4. Access the web interface at http://localhost:5000

## How to Use

1. Select your ship (determines cargo capacity)
2. Set your starting location
3. Add missions with:
   - Pickup location
   - Cargo type
   - One or more dropoff locations (with specific cargo types if needed)
   - Mission payout
4. Click "Calculate Optimal Route" to generate the best path
5. View the route on the map and step-by-step instructions
6. See your estimated total earnings

## Technologies Used

- Backend: Python with Flask
- Frontend: HTML, CSS, JavaScript
- Map: Leaflet.js
- Route optimization: NetworkX

## Project Structure

- `app.py` - Main Flask application
- `route_optimizer.py` - Optimization logic
- `data_fetcher.py` - Star Citizen location data
- `static/` - CSS, JavaScript, and images
- `templates/` - HTML templates

## License

MIT

## Not Affiliated

This tool is created by fans for Star Citizen players. Not affiliated with Cloud Imperium Games. 