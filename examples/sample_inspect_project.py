# Python Script: Inspect a local project's settings using ToonBoom.harmony
# Run via standard python interpreter (with Toon Boom packages added to path)

import sys
import os

# Append python-packages path (adjust installation folder name if necessary)
HARMONY_PYTHON_PATH = "/Applications/Toon Boom Harmony 24 Premium/Harmony 24 Premium.app/Contents/tba/macosx/lib/python-packages"
sys.path.append(HARMONY_PYTHON_PATH)

try:
    from ToonBoom import harmony
except ImportError:
    print("Error: Could not import ToonBoom.harmony. Check the HARMONY_PYTHON_PATH is configured properly.")
    sys.exit(1)

def inspect_xstage(xstage_path):
    if not os.path.exists(xstage_path):
        print(f"Error: Path does not exist: {xstage_path}")
        return

    print(f"Opening project: {xstage_path}")
    session = harmony.open_project(xstage_path)
    project = session.project

    print("\n--- Project Information ---")
    print(f"Project path: {project.project_path}")
    print(f"Resolution: {project.resolution}")
    print(f"Frame Rate: {project.frame_rate}")
    print(f"Total Frames: {project.num_frames}")

    # List root nodes
    print("\nNodes:")
    for node in project.root_group.nodes:
        print(f" - {node.path} [Type: {node.type}]")

if __name__ == "__main__":
    # Supply path to a test project's .xstage file
    inspect_xstage("MyTestProject/MyTestProject.xstage")
