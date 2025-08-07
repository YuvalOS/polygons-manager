#!/usr/bin/env python3
"""
Polygon Management API
A Flask-based REST API for managing polygons with SQLite database.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
DATABASE = 'polygons.db'

class DatabaseManager:
    """Handle database operations for polygon management."""
    
    @staticmethod
    def get_connection():
        """Get a new database connection."""
        conn = sqlite3.connect(DATABASE)
        conn.row_factory = sqlite3.Row
        return conn

    @staticmethod
    def init_db():
        """Initialize the database with required tables."""
        conn = DatabaseManager.get_connection()
        try:
            res = conn.executescript('''
                DROP TABLE IF EXISTS polygons;
                
                CREATE TABLE polygons (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    points TEXT NOT NULL
                );
            ''')
            print("Database initialized")
        finally:
            conn.close()

def validate_polygon_data(data: Dict[str, Any]) -> tuple[bool, str]:
    """
    Validate polygon creation/update data.
    
    Args:
        data: Dictionary containing polygon data
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not isinstance(data, dict):
        return False, "Invalid data format"
    
    # Check required fields
    if 'name' not in data:
        return False, "Name is required"
    
    if 'points' not in data:
        return False, "Points are required"
    
    # Validate name
    name = data['name']
    if not isinstance(name, str) or not name.strip():
        return False, "Name must be a non-empty string"
    
    if len(name.strip()) > 100:
        return False, "Name must be less than 100 characters"
    
    # Validate points
    points = data['points']
    if not isinstance(points, list):
        return False, "Points must be a list"
    
    if len(points) < 3:
        return False, "Polygon must have at least 3 points"
    
    if len(points) > 100:
        return False, "Polygon cannot have more than 100 points"
    
    # Validate each point
    for i, point in enumerate(points):
        if not isinstance(point, list) or len(point) != 2:
            return False, f"Point {i+1} must be a list with exactly 2 coordinates"
        
        try:
            x, y = float(point[0]), float(point[1])
            if not (0 <= x <= 10000) or not (0 <= y <= 10000):
                return False, f"Point {i+1} coordinates must be between 0 and 10000"
        except (ValueError, TypeError):
            return False, f"Point {i+1} coordinates must be numbers"
    
    return True, ""

class PolygonService:
    """Service layer for polygon operations."""
    
    @staticmethod
    def get_all_polygons() -> List[Dict[str, Any]]:
        """Get all polygons from database."""
        conn = DatabaseManager.get_connection()
        try:
            rows = conn.execute(
                'SELECT id, name, points FROM polygons'
            ).fetchall()
            
            polygons = []
            for row in rows:
                try:
                    points = json.loads(row['points'])
                    polygons.append({
                        'id': row['id'],
                        'name': row['name'],
                        'points': points
                    })
                except json.JSONDecodeError:
                    # Skip invalid polygon data
                    continue
                    
            return polygons
        finally:
            conn.close()
    
    @staticmethod
    def create_polygon(name: str, points: List[List[float]]) -> Dict[str, Any]:
        """Create a new polygon."""
        conn = DatabaseManager.get_connection()
        try:
            # Check if name already exists
            existing = conn.execute(
                'SELECT id FROM polygons WHERE name = ?', (name.strip(),)
            ).fetchone()
            
            if existing:
                raise ValueError("Polygon with this name already exists")
            
            cursor = conn.execute(
                'INSERT INTO polygons (name, points) VALUES (?, ?)',
                (name.strip(), json.dumps(points))
            )
            conn.commit()            
        finally:
            conn.close()
        
        return "success"
    
    @staticmethod
    def delete_polygon(polygon_id: int) -> bool:
        """Delete a polygon by ID."""
        conn = DatabaseManager.get_connection()
        try:
            cursor = conn.execute('DELETE FROM polygons WHERE id = ?', (polygon_id,))
            conn.commit()
            return cursor.rowcount > 0
        finally:
            conn.close()
    
# Error handlers
@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify({'error': 'Resource not found'}), 404

@app.errorhandler(400)
def bad_request(error):
    """Handle 400 errors."""
    return jsonify({'error': 'Bad request'}), 400

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors."""
    return jsonify({'error': 'Internal server error'}), 500

# API Routes
@app.route('/api/polygons', methods=['GET'])
def get_polygons():
    """
    Get all polygons.
    
    Returns:
        JSON response with list of polygons in format:
        [
            {
                "id": 1,
                "name": "P1", 
                "points": [[12.3, 12.0], [16.3, 12.0], [16.3, 8.0], [12.3, 8.0]]
            },
            ...
        ]
    """
    try:
        polygons = PolygonService.get_all_polygons()
        return jsonify(polygons)
    except Exception as e:
        app.logger.error(f"Error fetching polygons: {str(e)}")
        return jsonify({'error': 'Failed to fetch polygons'}), 500


@app.route('/api/polygons', methods=['POST'])
def create_polygon():
    """
    Create a new polygon.
    
    Expected JSON body:
    {
        "name": "Polygon Name",
        "points": [[x1, y1], [x2, y2], [x3, y3], ...]
    }
    
    Returns:
        JSON response with created polygon data
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate input data
        is_valid, error_message = validate_polygon_data(data)
        if not is_valid:
            return jsonify({'error': error_message}), 400
        
        # Create polygon
        polygon = PolygonService.create_polygon(data['name'], data['points'])
        
        return jsonify({
            'message': 'Polygon created successfully',
            'polygon': polygon
        }), 201
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        app.logger.error(f"Error creating polygon: {str(e)}")
        return jsonify({'error': 'Failed to create polygon'}), 500

@app.route('/api/polygons/<int:polygon_id>', methods=['DELETE'])
def delete_polygon(polygon_id):
    """Delete a polygon by ID."""
    try:
        success = PolygonService.delete_polygon(polygon_id)
        if not success:
            return jsonify({'error': 'Polygon not found'}), 404
        
        return jsonify({'message': 'Polygon deleted successfully'})
        
    except Exception as e:
        app.logger.error(f"Error deleting polygon {polygon_id}: {str(e)}")
        return jsonify({'error': 'Failed to delete polygon'}), 500

if __name__ == '__main__':
    # Initialize database if it doesn't exist
    if not os.path.exists(DATABASE):
        print("Initializing database...")
        DatabaseManager.init_db()
    
    # Run the Flask app
    app.run(debug=True, host='0.0.0.0', port=5000)