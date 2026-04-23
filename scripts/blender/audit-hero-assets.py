import argparse
import json
import os
import sys
from datetime import datetime, timezone

import bpy


SIGNALS = {
    "fabric": ["fabric", "seat", "cushion", "pillow", "leather"],
    "wood": ["wood", "oak", "desk", "shelf", "veneer"],
    "metal": ["metal", "steel", "frame", "leg", "hardware"],
    "glass": ["glass", "window"],
    "emissive": ["lamp", "emission", "emissive", "light_box", "_light"],
}


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-root", required=True)
    parser.add_argument("--models", required=True)
    parser.add_argument("--output", required=True)
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []
    return parser.parse_args(argv)


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def material_signals(material_names):
    result = {}
    for signal, fragments in SIGNALS.items():
        result[signal] = [
            name
            for name in material_names
            if any(fragment in name.lower() for fragment in fragments)
        ]
    return result


def imported_meshes():
    return [object for object in bpy.context.scene.objects if object.type == "MESH"]


def bounds_for_meshes(meshes):
    mins = [float("inf"), float("inf"), float("inf")]
    maxs = [float("-inf"), float("-inf"), float("-inf")]

    for mesh in meshes:
        for corner in mesh.bound_box:
            world = mesh.matrix_world @ __import__("mathutils").Vector(corner)
            mins[0] = min(mins[0], world.x)
            mins[1] = min(mins[1], world.y)
            mins[2] = min(mins[2], world.z)
            maxs[0] = max(maxs[0], world.x)
            maxs[1] = max(maxs[1], world.y)
            maxs[2] = max(maxs[2], world.z)

    if not meshes:
        mins = [0, 0, 0]
        maxs = [0, 0, 0]

    return {
        "min": {"x": round(mins[0], 5), "y": round(mins[1], 5), "z": round(mins[2], 5)},
        "max": {"x": round(maxs[0], 5), "y": round(maxs[1], 5), "z": round(maxs[2], 5)},
        "size": {
            "x": round(maxs[0] - mins[0], 5),
            "y": round(maxs[1] - mins[1], 5),
            "z": round(maxs[2] - mins[2], 5),
        },
    }


def risks_for_asset(meshes, material_names, signals, bounds):
    risks = []
    if not meshes:
        risks.append("no meshes imported")
    if len(material_names) <= 1:
        risks.append("single material limits runtime PBR overrides")
    if bounds["size"]["x"] <= 0 or bounds["size"]["y"] <= 0 or bounds["size"]["z"] <= 0:
        risks.append("empty or flat bounds")
    if not any(signals[key] for key in ["wood", "metal", "glass", "fabric", "emissive"]):
        risks.append("no material naming signals")
    return risks


def inspect_model(model_root, model):
    reset_scene()
    path = os.path.join(model_root, model["path"])
    bpy.ops.import_scene.gltf(filepath=path)
    meshes = imported_meshes()
    material_names = sorted({slot.material.name for mesh in meshes for slot in mesh.material_slots if slot.material})
    signals = material_signals(material_names)
    bounds = bounds_for_meshes(meshes)

    return {
        "id": model["id"],
        "path": model["path"],
        "meshCount": len(meshes),
        "materials": material_names,
        "materialSignals": signals,
        "bounds": bounds,
        "risks": risks_for_asset(meshes, material_names, signals, bounds),
    }


def main():
    args = parse_args()
    models = json.loads(args.models)
    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "assets": [inspect_model(args.model_root, model) for model in models],
    }

    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as file:
        json.dump(report, file, indent=2)
        file.write("\n")


if __name__ == "__main__":
    main()
