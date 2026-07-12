import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from .config import DATA_ROOT

class DatasetDefinition(BaseModel):
    datasetId: str
    name: str
    installed: bool = False
    sizeMb: float = 0.0
    license: str = "Unknown"
    provenance: Optional[str] = None

class DatasetRegistry:
    def __init__(self, registry_dir: Path = DATA_ROOT / "datasets" / "registry"):
        self.registry_dir = registry_dir
        self.registry_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = self.registry_dir / "datasets.json"
        self.datasets: Dict[str, DatasetDefinition] = {}
        self.load()

    def load(self):
        if self.db_path.is_file():
            try:
                data = json.loads(self.db_path.read_text(encoding="utf-8"))
                for k, v in data.items():
                    self.datasets[k] = DatasetDefinition(**v)
                return
            except Exception:
                pass
        self._init_defaults()
        self.save()

    def _init_defaults(self):
        defaults = [
            DatasetDefinition(
                datasetId="cartoon_set_sample",
                name="Cartoon Set Sample",
                installed=True,
                sizeMb=12.5,
                license="CC-BY-4.0",
                provenance="Google Cartoon Set"
            ),
            DatasetDefinition(
                datasetId="davis_sample",
                name="DAVIS Small Subset",
                installed=True,
                sizeMb=45.2,
                license="BSD-3-Clause",
                provenance="DAVIS 2017 Challenge"
            ),
            DatasetDefinition(
                datasetId="tap_vid_sample",
                name="TAP-Vid Small Subset",
                installed=True,
                sizeMb=8.1,
                license="Apache-2.0",
                provenance="DeepMind TAP-Vid Benchmark"
            )
        ]
        for d in defaults:
            self.datasets[d.datasetId] = d

    def save(self):
        data = {k: d.model_dump() for k, d in self.datasets.items()}
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.db_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    def list_datasets(self) -> List[DatasetDefinition]:
        return list(self.datasets.values())
