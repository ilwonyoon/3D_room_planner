import argparse
import json
import os
import sys

import bpy


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--variants", required=True)
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []
    return parser.parse_args(argv)


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def tune_materials(variant):
    renames = variant.get("materialRenames", {})
    emissive = set(variant.get("emissiveMaterials", []))

    for material in bpy.data.materials:
        material.name = renames.get(material.name, material.name)
        if material.name in emissive:
            material.use_nodes = True
            bsdf = material.node_tree.nodes.get("Principled BSDF")
            if bsdf:
                bsdf.inputs["Emission Color"].default_value = (1.0, 0.62, 0.28, 1)
                bsdf.inputs["Emission Strength"].default_value = 1.45
                bsdf.inputs["Roughness"].default_value = min(bsdf.inputs["Roughness"].default_value, 0.38)


def export_variant(repo_root, output_dir, variant):
    reset_scene()
    source = os.path.join(repo_root, variant["source"])
    output = os.path.join(output_dir, variant["output"])
    os.makedirs(os.path.dirname(output), exist_ok=True)

    bpy.ops.import_scene.gltf(filepath=source)
    tune_materials(variant)
    bpy.ops.export_scene.gltf(filepath=output, export_format="GLB", export_materials="EXPORT")
    print(f"wrote {output}")


def main():
    args = parse_args()
    variants = json.loads(args.variants)
    for variant in variants:
        export_variant(args.repo_root, args.output_dir, variant)


if __name__ == "__main__":
    main()
