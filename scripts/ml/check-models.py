#!/usr/bin/env python3
import os
import sys
import yaml

CONFIG_PATH = os.path.join(os.path.dirname(__file__), '../../config/ml-models.example.yaml')

def main():
    print("Checking ML model configuration...")
    if not os.path.exists(CONFIG_PATH):
        print(f"Error: Config not found at {CONFIG_PATH}")
        sys.exit(1)
        
    with open(CONFIG_PATH, "r") as f:
        config = yaml.safe_load(f)
        
    models = config.get("models", {})
    for model_id, settings in models.items():
        if settings.get("enabled", False):
            print(f"Model {model_id} is ENABLED. Will verify weights at {settings.get('weights_path')}")
        else:
            print(f"Model {model_id} is DISABLED. Skipping.")
            
    print("\nNote: Automatic download of large weights is disabled by default.")
    print("Please download required weights manually and update the configuration.")

if __name__ == "__main__":
    main()
