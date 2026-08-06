"""
_bootstrap.py — стенд лежит в подпапке, движок в родительской.

Импортируется первой строкой в каждом файле стенда: добавляет
harmony/client в путь поиска модулей, чтобы `columns`, `craft`, `camera`,
`drawings`, `imperfection`, `provenance` находились из testrig/.

Альтернатива (пакет с относительными импортами) потребовала бы переписать
и движок, и стенд. Стенд — заведомо временная вещь; тянуть его ради
чистоты в архитектуру движка неправильно.
"""

from __future__ import annotations

import sys
from pathlib import Path

_PARENT = str(Path(__file__).resolve().parent.parent)
if _PARENT not in sys.path:
    sys.path.insert(0, _PARENT)
