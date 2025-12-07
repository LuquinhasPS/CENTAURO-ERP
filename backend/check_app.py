import sys
import os

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

try:
    print("Attempting to import app.main...")
    from app.main import app
    print("✅ SUCCESS: app.main imported successfully!")
except Exception as e:
    print(f"❌ FAILURE: Error importing app.main: {e}")
    import traceback
    traceback.print_exc()
