import os
import sys

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import uvicorn
from app.main import app

if __name__ == "__main__":
    print("========================================================")
    print("  Starting Veyla Network Monitoring Server...")
    print("  Port: 8000")
    print("  Web Panel: http://localhost:8000")
    print("========================================================")
    uvicorn.run(app, host="0.0.0.0", port=8000)
