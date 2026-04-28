import argparse
import math
import os
import sys
from pathlib import Path

import bpy
from mathutils import Vector


ROOM = {
    "width": 5.4,
    "depth": 5.8,
    "height": 2.72,
}

OBJECTS = [
    {
        "id": "desk",
        "path": "public/assets/models/manual/zeel-by-furniture-simple-table.optimized.glb",
        "position": (0.56, -2.08),
        "elevation": 0.02,
        "rotation_y": math.pi / 2,
        "target_size": 1.78,
    },
    {
        "id": "armchair",
        "path": "public/assets/models/manual/dimensiva-plan-chair-by-fredericia.optimized.glb",
        "position": (0.56, -1.42),
        "elevation": 0.02,
        "rotation_y": math.pi,
        "target_size": 0.92,
    },
    {
        "id": "desk-lamp",
        "path": "public/assets/models/manual/designconnected-hollie-table-lamp-8909.optimized.glb",
        "position": (1.12, -2.24),
        "elevation": 0.555,
        "rotation_y": math.pi / 2,
        "target_size": 0.26,
    },
    {
        "id": "bookcase-left",
        "path": "public/assets/models/polyhaven/wooden_display_shelves_01.optimized.glb",
        "position": (-2.02, -2.52),
        "elevation": 0.02,
        "rotation_y": math.pi / 2,
        "target_size": 1.98,
    },
    {
        "id": "storage-right",
        "path": "public/assets/models/manual/zeel-by-furniture-rounded-commode.optimized.glb",
        "position": (2.02, -2.22),
        "elevation": 0.02,
        "rotation_y": 0,
        "target_size": 1.5,
    },
    {
        "id": "lounge-sofa",
        "path": "public/assets/models/manual/dimensiva-hackney-sofa-by-hay.optimized.glb",
        "position": (0.76, 1.64),
        "elevation": 0.02,
        "rotation_y": math.pi,
        "target_size": 2.2,
    },
    {
        "id": "lounge-coffee-table",
        "path": "public/assets/models/manual/dimensiva-ibiza-forte-coffee-table-by-ritzwell.optimized.glb",
        "position": (0.24, 0.44),
        "elevation": 0.02,
        "rotation_y": 0,
        "target_size": 1.1,
    },
    {
        "id": "coffee-table-books",
        "path": "public/assets/models/polyhaven/book_encyclopedia_set_01.optimized.glb",
        "position": (0.02, 0.32),
        "elevation": 0.48,
        "rotation_y": math.pi / 10,
        "target_size": 0.24,
    },
    {
        "id": "coffee-table-vase",
        "path": "public/assets/models/polyhaven/ceramic_vase_03.optimized.glb",
        "position": (0.42, 0.48),
        "elevation": 0.48,
        "rotation_y": -math.pi / 8,
        "target_size": 0.2,
    },
    {
        "id": "window-main",
        "path": "public/assets/models/architectural/modern-wide-picture-window.optimized.glb",
        "position": (0.32, -2.84),
        "elevation": 0.92,
        "rotation_y": 0,
        "target_size": 1.524,
    },
    {
        "id": "bookshelf-vase-top",
        "path": "public/assets/models/polyhaven/ceramic_vase_02.optimized.glb",
        "position": (-2.16, -2.32),
        "elevation": 1.78,
        "rotation_y": 0,
        "target_size": 0.17,
    },
    {
        "id": "bookshelf-books-middle",
        "path": "public/assets/models/polyhaven/book_encyclopedia_set_01.optimized.glb",
        "position": (-1.86, -2.32),
        "elevation": 1.2,
        "rotation_y": 0,
        "target_size": 0.24,
    },
    {
        "id": "bookshelf-bookend",
        "path": "public/assets/models/manual/dimensiva-stop-bookend-by-e15.optimized.glb",
        "position": (-2.18, -2.32),
        "elevation": 0.82,
        "rotation_y": 0,
        "target_size": 0.16,
    },
    {
        "id": "bookshelf-books-lower",
        "path": "public/assets/models/polyhaven/book_encyclopedia_set_01.optimized.glb",
        "position": (-1.82, -2.32),
        "elevation": 0.72,
        "rotation_y": math.pi / 2,
        "target_size": 0.22,
    },
    {
        "id": "floor-plant",
        "path": "public/assets/models/polyhaven/potted_plant_04.optimized.glb",
        "position": (-2.16, 1.82),
        "elevation": 0.02,
        "rotation_y": 0,
        "target_size": 0.78,
    },
    {
        "id": "tall-plant-right",
        "path": "public/assets/models/polyhaven/potted_plant_01.optimized.glb",
        "position": (2.2, 0.34),
        "elevation": 0.02,
        "rotation_y": -math.pi / 7,
        "target_size": 1.18,
    },
    {
        "id": "small-plant",
        "path": "public/assets/models/polyhaven/ceramic_vase_01.optimized.glb",
        "position": (2.22, -2.02),
        "elevation": 0.96,
        "rotation_y": 0,
        "target_size": 0.32,
    },
    {
        "id": "storage-books-top",
        "path": "public/assets/models/polyhaven/book_encyclopedia_set_01.optimized.glb",
        "position": (1.72, -2.08),
        "elevation": 0.84,
        "rotation_y": -math.pi / 8,
        "target_size": 0.24,
    },
    {
        "id": "reading-chair",
        "path": "public/assets/models/manual/zeel-by-furniture-blown-armchair.optimized.glb",
        "position": (-1.38, 0.88),
        "elevation": 0.02,
        "rotation_y": math.pi / 5,
        "target_size": 1.02,
    },
    {
        "id": "reading-side-table",
        "path": "public/assets/models/manual/dimensiva-slit-side-table-round-high-by-hay.optimized.glb",
        "position": (-0.92, 1.22),
        "elevation": 0.02,
        "rotation_y": 0,
        "target_size": 0.48,
    },
    {
        "id": "reading-lamp",
        "path": "public/assets/models/manual/dimensiva-toio-led-floor-lamp-by-flos.optimized.glb",
        "position": (-2.22, 0.72),
        "elevation": 0.02,
        "rotation_y": 0,
        "target_size": 1.9,
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
    floor_mat = make_mat("low sheen warm oak floor", (0.50, 0.34, 0.18, 1), 0.9)
    wall_mat = make_mat("soft plaster wall", (0.84, 0.81, 0.75, 1), 0.9)
    trim_mat = make_mat("painted trim", (0.93, 0.91, 0.86, 1), 0.58)
    rug_mat = make_mat("burnt orange wool rug", (0.78, 0.31, 0.12, 1), 0.96)
    glass_mat = make_emission_mat("window sky glow", (0.68, 0.86, 0.94, 1), 0.65)

    add_plane("floor", (width, depth, 0.04), (0, 0, -0.02), (0, 0, 0), floor_mat)
    add_plane("back wall", (width, 0.06, height), (0, -depth / 2, height / 2), (0, 0, 0), wall_mat)
    add_plane("left wall", (0.06, depth, height), (-width / 2, 0, height / 2), (0, 0, 0), wall_mat)
    add_plane("baseboard back", (width + 0.08, 0.08, 0.09), (0, -depth / 2 + 0.045, 0.045), (0, 0, 0), trim_mat)
    add_plane("baseboard left", (0.08, depth + 0.08, 0.09), (-width / 2 + 0.045, 0, 0.045), (0, 0, 0), trim_mat)
    add_plane("office rug", (3.25, 2.16, 0.018), (0.14, 0.58, 0.018), (0, 0, 0), rug_mat)

    window_x = 0.32
    window_z = -depth / 2 + 0.035
    window_center_z = 0.92 + 1.0668 * 0.5
    add_plane("window glow", (1.34, 0.035, 0.78), (window_x, window_z, window_center_z), (0, 0, 0), glass_mat)
    add_plane("window top frame", (1.58, 0.055, 0.055), (window_x, window_z + 0.025, window_center_z + 0.49), (0, 0, 0), trim_mat)
    add_plane("window bottom frame", (1.58, 0.055, 0.055), (window_x, window_z + 0.025, window_center_z - 0.49), (0, 0, 0), trim_mat)
    add_plane("window left frame", (0.055, 0.055, 0.98), (window_x - 0.79, window_z + 0.025, window_center_z), (0, 0, 0), trim_mat)
    add_plane("window right frame", (0.055, 0.055, 0.98), (window_x + 0.79, window_z + 0.025, window_center_z), (0, 0, 0), trim_mat)


def add_procedural_accents():
    screen_mat = make_emission_mat("soft monitor screen", (0.78, 0.88, 0.94, 1), 0.45)
    black_mat = make_mat("soft black plastic", (0.025, 0.024, 0.023, 1), 0.82)
    metal_mat = make_mat("brushed dark metal", (0.08, 0.075, 0.07, 1), 0.66, 0.2)
    paper_mat = make_mat("warm art paper", (0.86, 0.80, 0.7, 1), 0.94)
    curtain_mat = make_mat("sheer warm curtain", (0.9, 0.86, 0.78, 1), 0.98)

    add_plane("iMac screen proxy", (0.5, 0.035, 0.32), (0.58, -2.22, 0.88), (0, 0, 0), black_mat)
    add_plane("iMac lit panel", (0.44, 0.036, 0.26), (0.58, -2.245, 0.89), (0, 0, 0), screen_mat)
    add_plane("iMac stand proxy", (0.08, 0.055, 0.22), (0.58, -2.18, 0.68), (0, 0, 0), metal_mat)
    add_plane("laptop proxy", (0.42, 0.3, 0.025), (0.14, -2.14, 0.59), (0, 0, -0.24), metal_mat)
    add_plane("homepod proxy", (0.16, 0.16, 0.16), (0.92, -2.07, 0.64), (0, 0, 0), black_mat)

    add_plane("back wall print left", (0.32, 0.025, 0.42), (-1.05, -2.865, 1.48), (0, 0, 0), paper_mat)
    add_plane("back wall print right", (0.36, 0.025, 0.44), (1.86, -2.865, 1.25), (0, 0, 0), paper_mat)
    add_plane("left curtain", (0.48, 0.02, 1.26), (-0.52, -2.83, 1.39), (0, 0, 0), curtain_mat)
    add_plane("right curtain", (0.48, 0.02, 1.26), (1.16, -2.83, 1.39), (0, 0, 0), curtain_mat)


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
    bpy.ops.object.light_add(type="AREA", location=(0.32, -2.58, 1.86))
    window = bpy.context.object
    window.name = "motivated window key"
    window.data.energy = 720
    window.data.size = 2.35
    look_at(window, (0.08, 0.1, 0.72))

    bpy.ops.object.light_add(type="AREA", location=(-1.95, 2.65, 2.86))
    fill = bpy.context.object
    fill.name = "cool room fill"
    fill.data.energy = 120
    fill.data.size = 4.8
    look_at(fill, (-0.1, -0.1, 0.85))

    for name, loc, energy in [
        ("desk practical", (1.12, -2.24, 0.96), 45),
        ("reading practical", (-2.22, 0.72, 1.52), 78),
    ]:
        bpy.ops.object.light_add(type="POINT", location=loc)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.color = (1.0, 0.78, 0.46)
        light.data.shadow_soft_size = 1.0


def add_camera():
    bpy.ops.object.camera_add(location=(7.4, 7.2, 6.2))
    camera = bpy.context.object
    look_at(camera, (0, -0.1, 0.9))
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 8.9
    bpy.context.scene.camera = camera


def configure_render(output):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 192
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 7
    scene.cycles.diffuse_bounces = 3
    scene.cycles.glossy_bounces = 3
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
    add_procedural_accents()
    add_lighting()
    add_camera()
    configure_render(args.output)
    bpy.ops.render.render(write_still=True)
    print(f"wrote {args.output}")


if __name__ == "__main__":
    main()
