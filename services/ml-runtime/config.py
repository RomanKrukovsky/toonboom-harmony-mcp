import yaml

def load_config(path: str = "../../config/ml-models.example.yaml") -> dict:
    try:
        with open(path, "r") as f:
            return yaml.safe_load(f)
    except Exception as e:
        return {"models": {}}

CONFIG = load_config()
