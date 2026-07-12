from abc import ABC, abstractmethod
from typing import Any, Dict

class BaseMLProvider(ABC):
    def __init__(self, model_id: str):
        self.model_id = model_id
        self.loaded = False

    @abstractmethod
    def check_availability(self) -> bool:
        """Returns True if dependencies and files needed for this provider are available."""
        pass

    @abstractmethod
    def load_model(self) -> bool:
        """Loads weights or initializes the model runtime. Returns True if successful."""
        pass

    @abstractmethod
    def run_inference(self, inputs: Dict[str, Any], progress_callback: Any = None) -> Any:
        """Runs the model on inputs and returns the structured manifest dict."""
        pass
