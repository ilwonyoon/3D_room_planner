import argparse
import math
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOM = {
    "width": 4.2,
    "depth": 5.0,
    "height": 2.4,
}

OBJECTS = [
    {
        "id": "desk",
        "path": "public/assets/models/polyhaven/metal_office_desk.optimized.glb",
        "position": (0.3, -2.04),
        "elevation": 0.02,
        "rotation_y": 0,
        "target_size": 1.68,
    },
    {
        "id": "armchair",
        "path": "public/assets/models/polyhaven/modern_arm_chair_01.optimized.glb",
        "position": (0.32, -1.16),
        "elevation": 0.02,
        "rotation_y": math.pi,
        "target_size": 0.84,
    },
    {
        "id": "desk-lamp",
        "path": "public/assets/models/polyhaven/desk_lamp_arm_01.optimized.glb",
        "position": (0.96, -1.94),
        "elevation": 0.78,
        "rotation_y": 0,
        "target_size": 0.48,
    },
    {
        "id": "bookcase-left",
        "path": "public/assets/models/polyhaven/steel_frame_shelves_03.optimized.glb",
        "position": (-1.62, -2.12),
        "elevation": 0.02,
        "rotation_y": 0,
        "target_size": 1.72,
    },
    {
        "id": "storage-right",
        "path": "public/assets/models/sharetextures/sharetextures-cabinet-3.optimized.glb",
        "position": (1.48, -1.62),
        "elevation": 0.02,
        "rotation_y": 0,
        "target_size": 1.12,
    },
    {
        "id": "reading-lamp",
        "path": "public/assets/models/polyhaven/industrial_pipe_lamp.optimized.glb",
        "position": (-1.62, 0.62),
        "elevation": 0.02,
        "rotation_y": 0,
        "target_size": 1.6,
    },
    {
        "id": "lounge-chair",
        "path": "public/assets/models/polyhaven/modern_arm_chair_01.optimized.glb",
        "position": (-0.96, 0.95),
        "elevation": 0.02,
        "rotation_y": math.pi / 5,
        "target_size": 0.88,
    },
    {
        "id": "round-side-table",
        "path": "public/assets/models/polyhaven/side_table_01.optimized.glb",
        "position": (-1.62, 1.24),
        "elevation": 0.02,
        "rotation_y": 0,
        "target_size": 0.56,
    },
    {
        "id": "floor-plant",
        "path": "public/assets/models/polyhaven/potted_plant_04.optimized.glb",
        "position": (1.66, -1.12),
        "elevation": 0.02,
        "rotation_y": 0,
        "target_size": 0.76,
    },
]


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--model-root")
    parser.add_argument("--output", required=True)
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []
    return parser.parse_args(argv)


def clean_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def make_mat(name, color, roughness=0.7, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
    return mat


def make_emission_mat(name, color, strength):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    for node in list(nodes):
        nodes.remove(node)
    output = nodes.new(type="ShaderNodeOutputMaterial")
    emission = nodes.new(type="ShaderNodeEmission")
    emission.inputs["Color"].default_value = color
    emission.inputs["Strength"].default_value = strength
    mat.node_tree.links.new(emission.outputs["Emission"], output.inputs["Surface"])
    return mat


def add_plane(name, size, location, rotation, material):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    return obj


def add_room():
    width = ROOM["width"]
    depth = ROOM["depth"]
    height = ROOM["height"]
    floor_mat = make_mat("warm oak floor", (0.55, 0.40, 0.26, 1), 0.62)
    wall_mat = make_mat("soft plaster wall", (0.86, 0.84, 0.79, 1), 0.86)
    trim_mat = make_mat("painted trim", (0.93, 0.91, 0.86, 1), 0.58)
    rug_mat = make_mat("wool rug", (0.58, 0.53, 0.47, 1), 0.95)
    glass_mat = make_emission_mat("window sky glow", (0.68, 0.86, 0.94, 1), 0.65)

    add_plane("floor", (width, depth, 0.04), (0, 0, -0.02), (0, 0, 0), floor_mat)
    add_plane("back wall", (width, 0.06, height), (0, -depth / 2, height / 2), (0, 0, 0), wall_mat)
    add_plane("left wall", (0.06, depth, height), (-width / 2, 0, height / 2), (0, 0, 0), wall_mat)
    add_plane("baseboard back", (width + 0.08, 0.08, 0.09), (0, -depth / 2 + 0.045, 0.045), (0, 0, 0), trim_mat)
    add_plane("baseboard left", (0.08, depth + 0.08, 0.09), (-width / 2 + 0.045, 0, 0.045), (0, 0, 0), trim_mat)
    add_plane("rug", (1.92, 1.28, 0.018), (-0.1, -0.18, 0.018), (0, 0, 0), rug_mat)

    window_x = 1.05
    window_z = -depth / 2 + 0.035
    window_center_z = 1.18 + 0.98 * 0.5
    add_plane("window glow", (1.34, 0.035, 0.78), (window_x, window_z, window_center_z), (0, 0, 0), glass_mat)
    add_plane("window top frame", (1.58, 0.055, 0.055), (window_x, window_z + 0.025, window_center_z + 0.49), (0, 0, 0), trim_mat)
    add_plane("window bottom frame", (1.58, 0.055, 0.055), (window_x, window_z + 0.025, window_center_z - 0.49), (0, 0, 0), trim_mat)
    add_plane("window left frame", (0.055, 0.055, 0.98), (window_x - 0.79, window_z + 0.025, window_center_z), (0, 0, 0), trim_mat)
    add_plane("window right frame", (0.055, 0.055, 0.98), (window_x + 0.79, window_z + 0.025, window_center_z), (0, 0, 0), trim_mat)


def bbox_world(objects):
    points = []
    for obj in objects:
        if obj.type == "MESH":
            points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    if not points:
        return None
    min_v = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
    max_v = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
    return min_v, max_v


def normalize_imported(objects, target_size):
    bounds = bbox_world(objects)
    if not bounds:
        return 1.0
    min_v, max_v = bounds
    size = max_v - min_v
    scale = target_size / max(size.x, size.y, size.z, 0.001)
    center = (min_v + max_v) * 0.5
    bottom = min_v.z
    for obj in objects:
        obj.location.x = (obj.location.x - center.x) * scale
        obj.location.y = (obj.location.y - center.y) * scale
        obj.location.z = (obj.location.z - bottom) * scale
        obj.scale = (obj.scale.x * scale, obj.scale.y * scale, obj.scale.z * scale)
    return scale


def import_model(repo_root, model_root, item):
    source_path = Path(repo_root) / item["path"]
    blender_path = Path(model_root) / item["path"] if model_root else source_path
    path = blender_path if blender_path.exists() else source_path
    if not path.exists():
        print(f"skip missing model: {path}")
        return
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    imported = [obj for obj in bpy.context.scene.objects if obj not in before]
    normalize_imported(imported, item["target_size"])
    empty = bpy.data.objects.new(item["id"], None)
    bpy.context.collection.objects.link(empty)
    empty.location = (item["position"][0], item["position"][1], item["elevation"])
    empty.rotation_euler = (0, 0, -item["rotation_y"])
    for obj in imported:
        obj.parent = empty
        if obj.type == "MESH":
            obj.name = f"{item['id']}.{obj.name}"
            obj.data.name = f"{item['id']}.{obj.data.name}"
            for poly in obj.data.polygons:
                poly.use_smooth = True


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_lighting():
    bpy.ops.object.light_add(type="AREA", location=(1.05, -2.12, 1.72))
    window = bpy.context.object
    window.name = "motivated window key"
    window.data.energy = 580
    window.data.size = 2.1
    look_at(window, (0.05, -0.2, 0.75))

    bpy.ops.object.light_add(type="AREA", location=(-1.6, 2.4, 2.55))
    fill = bpy.context.object
    fill.name = "cool room fill"
    fill.data.energy = 90
    fill.data.size = 4.0
    look_at(fill, (-0.15, -0.2, 0.75))

    for name, loc, energy in [
        ("desk practical", (0.96, -1.94, 1.22), 35),
        ("floor practical", (-1.62, 0.62, 1.36), 65),
    ]:
        bpy.ops.object.light_add(type="POINT", location=loc)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.color = (1.0, 0.78, 0.46)
        light.data.shadow_soft_size = 1.0


def add_camera():
    bpy.ops.object.camera_add(location=(6.8, 6.8, 5.9))
    camera = bpy.context.object
    look_at(camera, (0, -0.15, 0.75))
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 8.2
    bpy.context.scene.camera = camera


def configure_render(output):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 96
    scene.cycles.use_denoising = True
    scene.view_settings.view_transform = "Filmic"
    scene.view_settings.look = "Medium High Contrast"
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1
    scene.world = bpy.data.worlds.new("soft studio world")
    scene.world.color = (0.02, 0.02, 0.02)
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.film_transparent = False
    scene.render.filepath = output


def main():
    args = parse_args()
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    clean_scene()
    add_room()
    for item in OBJECTS:
        import_model(args.repo_root, args.model_root, item)
    add_lighting()
    add_camera()
    configure_render(args.output)
    bpy.ops.render.render(write_still=True)
    print(f"wrote {args.output}")


if __name__ == "__main__":
    main()
