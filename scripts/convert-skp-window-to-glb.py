#!/opt/homebrew/bin/python3.10

import argparse
import importlib.util
import json
from collections import defaultdict
from pathlib import Path

import numpy as np
import trimesh


SKP_IMPORTER_DIR = Path(
    "output/tools/skp2blender/macos-arch64/sketchup-importer-macos"
)


def load_sketchup_module(importer_dir: Path):
    module_path = importer_dir / "sketchup.so"
    spec = importlib.util.spec_from_file_location("sketchup", module_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def as_rgba(material):
    if material is None:
        return (230, 230, 230, 255)
    color = getattr(material, "color", None)
    opacity = getattr(material, "opacity", 1.0)
    if color is None:
        alpha = int(max(0.0, min(1.0, opacity)) * 255)
        return (230, 230, 230, alpha)
    rgba = tuple(color)
    if len(rgba) == 4 and rgba[3] < 255:
        alpha = rgba[3]
    else:
        alpha = int(round(max(0.0, min(1.0, opacity)) * 255))
    return (rgba[0], rgba[1], rgba[2], alpha)


def material_key(material):
    if material is None:
        return "default"
    return getattr(material, "name", None) or "default"


def apply_transform(vertices, transform):
    if len(vertices) == 0:
        return vertices
    matrix = np.array(transform, dtype=np.float64)
    points = np.c_[vertices, np.ones(len(vertices))]
    transformed = points @ matrix.T
    return transformed[:, :3]


def orient_vertices(vertices, permutation, flip_z):
    if len(vertices) == 0:
        return vertices
    converted = vertices[:, permutation].copy()
    if flip_z:
        converted[:, 2] *= -1.0
    return converted


def append_face(bucket, vertices, triangles):
    base = len(bucket["vertices"])
    bucket["vertices"].extend(vertices.tolist())
    bucket["faces"].extend([[a + base, b + base, c + base] for a, b, c in triangles])


def traverse_entities(entities, transform, inherited_material, buckets):
    for face in entities.faces:
        material = getattr(face, "material", None) or inherited_material
        verts, tris, _uvs = face.tessfaces
        if not verts or not tris:
            continue
        verts = np.array(verts, dtype=np.float64)
        verts = apply_transform(verts, transform)
        key = material_key(material)
        bucket = buckets[key]
        bucket["material"] = material
        append_face(bucket, verts, tris)

    for group in entities.groups:
        if getattr(group, "hidden", False):
            continue
        next_material = getattr(group, "material", None) or inherited_material
        next_transform = np.array(transform) @ np.array(group.transform)
        traverse_entities(group.entities, next_transform, next_material, buckets)

    for instance in entities.instances:
        if getattr(instance, "hidden", False):
            continue
        next_material = getattr(instance, "material", None) or inherited_material
        next_transform = np.array(transform) @ np.array(instance.transform)
        traverse_entities(
            instance.definition.entities,
            next_transform,
            next_material,
            buckets,
        )


def build_scene(buckets):
    all_vertices = [
        np.array(bucket["vertices"], dtype=np.float64)
        for bucket in buckets.values()
        if bucket["vertices"]
    ]
    combined = np.vstack(all_vertices)
    extents = combined.max(axis=0) - combined.min(axis=0)
    depth_axis = int(np.argmin(extents))
    permutation = [axis for axis in (0, 1, 2) if axis != depth_axis] + [depth_axis]
    parity = 0
    for i in range(3):
        for j in range(i + 1, 3):
            parity ^= permutation[i] > permutation[j]
    flip_z = bool(parity)

    scene = trimesh.Scene()
    oriented_all = [orient_vertices(vertices, permutation, flip_z) for vertices in all_vertices]
    oriented_combined = np.vstack(oriented_all)
    scene_min = oriented_combined.min(axis=0)
    scene_max = oriented_combined.max(axis=0)
    offset = np.array(
        [
            -scene_min[0],
            -scene_min[1],
            -((scene_min[2] + scene_max[2]) * 0.5),
        ],
        dtype=np.float64,
    )

    stats = {
        "materials": [],
        "sourceExtents": extents.tolist(),
        "axisPermutation": permutation,
        "flipZ": flip_z,
        "offset": offset.tolist(),
    }
    for key, bucket in buckets.items():
        if not bucket["faces"]:
            continue
        vertices = np.array(bucket["vertices"], dtype=np.float64)
        vertices = orient_vertices(vertices, permutation, flip_z)
        vertices += offset
        faces = np.array(bucket["faces"], dtype=np.int64)
        rgba = as_rgba(bucket["material"])
        material = trimesh.visual.material.PBRMaterial(
            name=key,
            baseColorFactor=[c / 255.0 for c in rgba],
            alphaMode="BLEND" if rgba[3] < 250 else "OPAQUE",
            metallicFactor=0.0,
            roughnessFactor=0.65 if rgba[3] < 250 else 0.85,
        )
        mesh = trimesh.Trimesh(vertices=vertices, faces=faces, process=False)
        mesh.visual = trimesh.visual.texture.TextureVisuals(material=material)
        scene.add_geometry(mesh, node_name=key, geom_name=key)
        bounds = mesh.bounds.tolist()
        stats["materials"].append(
            {
                "name": key,
                "rgba": rgba,
                "triangles": int(len(faces)),
                "bounds": bounds,
            }
        )
    stats["geometryCount"] = len(scene.geometry)
    if scene.geometry:
        stats["sceneBounds"] = np.array(scene.bounds).tolist()
        extents = np.array(scene.extents).tolist()
        stats["sceneExtents"] = extents
    return scene, stats


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument(
        "--importer-dir",
        type=Path,
        default=SKP_IMPORTER_DIR,
    )
    parser.add_argument("--stats", type=Path)
    args = parser.parse_args()

    sketchup = load_sketchup_module(args.importer_dir.resolve())
    model = sketchup.Model.from_file(str(args.input.resolve()))

    buckets = defaultdict(lambda: {"material": None, "vertices": [], "faces": []})
    traverse_entities(
        model.entities,
        np.identity(4, dtype=np.float64),
        None,
        buckets,
    )

    scene, stats = build_scene(buckets)
    if not scene.geometry:
        raise RuntimeError(f"No geometry extracted from {args.input}")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with open(args.output, "wb") as fh:
        fh.write(scene.export(file_type="glb"))

    if args.stats:
        args.stats.parent.mkdir(parents=True, exist_ok=True)
        args.stats.write_text(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()
