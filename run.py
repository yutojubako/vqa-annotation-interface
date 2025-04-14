#!/usr/bin/env python3
"""
Simple HTTP server for running the VQA Panorama Annotation Interface locally.
"""

import os
import sys
import webbrowser
import argparse
from http.server import HTTPServer, SimpleHTTPRequestHandler

def run_server(port=8000, directory="frontend"):
    """Run a simple HTTP server to serve the annotation interface."""
    # Change to the frontend directory
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), directory))
    
    # Create the server
    server_address = ('', port)
    httpd = HTTPServer(server_address, SimpleHTTPRequestHandler)
    
    # Print server information
    print(f"Starting server at http://localhost:{port}")
    print("Press Ctrl+C to stop the server")
    
    # Open the browser
    webbrowser.open(f"http://localhost:{port}")
    
    # Run the server
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")
        sys.exit(0)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the VQA Panorama Annotation Interface locally")
    parser.add_argument("--port", type=int, default=8000, help="Port to run the server on (default: 8000)")
    parser.add_argument("--no-browser", action="store_true", help="Don't open the browser automatically")
    parser.add_argument("--admin", action="store_true", help="Open the admin dashboard instead of the annotation interface")
    
    args = parser.parse_args()
    
    # Change to the frontend directory
    frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")
    os.chdir(frontend_dir)
    
    # Create the server
    server_address = ('0.0.0.0', args.port)  # Bind to all interfaces
    httpd = HTTPServer(server_address, SimpleHTTPRequestHandler)
    
    # Print server information
    import socket
    hostname = socket.gethostname()
    try:
        # Get local IP address
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
    except:
        local_ip = "unknown"
    
    print(f"Starting server at:")
    print(f"  - Local:   http://localhost:{args.port}")
    print(f"  - Network: http://{local_ip}:{args.port}")
    print(f"Serving files from: {frontend_dir}")
    print("Press Ctrl+C to stop the server")
    
    # Open the browser
    if not args.no_browser:
        url = f"http://localhost:{args.port}/{'admin.html' if args.admin else 'index.html'}"
        print(f"Opening {url} in your browser")
        webbrowser.open(url)
    
    # Run the server
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped")
        sys.exit(0)
