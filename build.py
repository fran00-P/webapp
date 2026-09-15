#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera site/data.json a partir de survey_content.py.

Uso:
    python3 build.py

Correr esto cada vez que se edite survey_content.py, y después recargar
site/index.html en el navegador (o volver a hacer commit/push si se usa
GitHub Pages).
"""
import json
import os

from survey_content import BLOCKS, ARMS, ARM_LABELS

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_PATH = os.path.join(HERE, "site", "data.js")


def main():
    data = {
        "arms": ARMS,
        "arm_labels": ARM_LABELS,
        "blocks": BLOCKS,
    }
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    payload = json.dumps(data, ensure_ascii=False, indent=2)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("// Generado automáticamente por build.py -- NO editar a mano.\n")
        f.write("// Para cambiar el contenido, editar survey_content.py y correr build.py.\n")
        f.write("window.SURVEY_DATA = ")
        f.write(payload)
        f.write(";\n")
    print(f"OK -> {OUT_PATH} ({len(BLOCKS)} bloques)")


if __name__ == "__main__":
    main()
