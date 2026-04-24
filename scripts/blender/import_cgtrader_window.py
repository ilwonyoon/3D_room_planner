import argparse
import math
import os
import sys

import bpy
from mathutils import Vector


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--target-width-cm", type=float, required=True)
    parser.add_argument("--target-height-cm", type=float, required=True)
    parser.add_argument("--target-depth-cm", type=float, required=True)
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []
    return parser.parse_args(argv)


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def import_asset(path):
    extension = os.path.splitext(path)[1].lower()

    if extension in [".glb", ".gltf"]:
        bpy.ops.import_scene.gltf(filepath=path)
        return

    if extension == ".fbx":
        bpy.ops.import_scene.fbx(filepath=path, automatic_bone_orientation=True)
        return

    if extension == ".obj":
        if hasattr(bpy.ops.wm, "obj_import"):
            bpy.ops.wm.obj_import(filepath=path, up_axis="Z", forward_axis="Y")
        else:
            bpy.ops.import_scene.obj(filepath=path)
        return

    if extension == ".blend":
        bpy.ops.wm.open_mainfile(filepath=path)
        return

    raise RuntimeError(f"Unsupported input format: {extension}")


def mesh_objects():
    return [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]


def create_root_parent():
    root = bpy.data.objects.new("WindowImportRoot", None)
    bpy.context.collection.objects.link(root)

    for obj in mesh_objects():
        if obj.parent is None:
            obj.parent = root

    bpy.context.view_layer.update()
    return root


def remove_non_mesh_objects():
    for obj in list(bpy.context.scene.objects):
        if obj.type != "MESH":
            bpy.data.objects.remove(obj, do_unlink=True)


def ensure_material(name, base_color, roughness, metallic=0.0, transmission=0.0, alpha=1.0):
    material = bpy.data.materials.get(name)
    if material is None:
        material = bpy.data.materials.new(name)

    material.use_nodes = True
    material.blend_method = "BLEND" if alpha < 1.0 or transmission > 0.0 else "OPAQUE"
    if hasattr(material, "shadow_method"):
        material.shadow_method = "NONE" if material.blend_method == "BLEND" else "OPAQUE"

    nodes = material.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf is None:
        nodes.clear()
        output = nodes.new(type="ShaderNodeOutputMaterial")
        bsdf = nodes.new(type="ShaderNodeBsdfPrincipled")
        material.node_tree.links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])

    bsdf.inputs["Base Color"].default_value = base_color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic

    if "Transmission Weight" in bsdf.inputs:
        bsdf.inputs["Transmission Weight"].default_value = transmission
    elif "Transmission" in bsdf.inputs:
        bsdf.inputs["Transmission"].default_value = transmission

    if "Alpha" in bsdf.inputs:
        bsdf.inputs["Alpha"].default_value = alpha

    return material


def classify_material(material):
    if material is None:
        return "frame"

    name = material.name.lower()
    if any(token in name for token in ["glass", "pane", "windowpane", "glazing"]):
        return "glass"
    if any(token in name for token in ["metal", "handle", "hinge", "lock", "aluminium", "aluminum", "steel"]):
        return "hardware"

    if not material.use_nodes:
        return "frame"

    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf is None:
        return "frame"

    transmission = 0.0
    if "Transmission Weight" in bsdf.inputs:
        transmission = bsdf.inputs["Transmission Weight"].default_value
    elif "Transmission" in bsdf.inputs:
        transmission = bsdf.inputs["Transmission"].default_value

    alpha = bsdf.inputs["Alpha"].default_value if "Alpha" in bsdf.inputs else 1.0
    metallic = bsdf.inputs["Metallic"].default_value

    if transmission > 0.1 or alpha < 0.9:
        return "glass"
    if metallic > 0.2:
        return "hardware"

    return "frame"


def apply_material_overrides():
    frame_material = ensure_material(
        "window_frame_white_satin",
        (0.96, 0.96, 0.95, 1.0),
        0.42,
        0.0,
        0.0,
        1.0,
    )
    hardware_material = ensure_material(
        "window_hardware_brushed_aluminum",
        (0.63, 0.64, 0.66, 1.0),
        0.28,
        0.82,
        0.0,
        1.0,
    )
    glass_material = ensure_material(
        "window_glass_clear_tinted",
        (0.92, 0.95, 0.98, 0.22),
        0.02,
        0.0,
        1.0,
        0.22,
    )

    for obj in mesh_objects():
        if not obj.data.materials:
            obj.data.materials.append(frame_material)
            continue

        for index, material in enumerate(obj.data.materials):
            kind = classify_material(material)
            if kind == "glass":
                obj.data.materials[index] = glass_material
            elif kind == "hardware":
                obj.data.materials[index] = hardware_material
            else:
                obj.data.materials[index] = frame_material


def scene_bounds():
    minimum = Vector((math.inf, math.inf, math.inf))
    maximum = Vector((-math.inf, -math.inf, -math.inf))

    for obj in mesh_objects():
        for corner in obj.bound_box:
            world_corner = obj.matrix_world @ Vector(corner)
            minimum.x = min(minimum.x, world_corner.x)
            minimum.y = min(minimum.y, world_corner.y)
            minimum.z = min(minimum.z, world_corner.z)
            maximum.x = max(maximum.x, world_corner.x)
            maximum.y = max(maximum.y, world_corner.y)
            maximum.z = max(maximum.z, world_corner.z)

    return minimum, maximum


def apply_uniform_scale(scale):
    for obj in mesh_objects():
        obj.scale *= scale

    bpy.context.view_layer.update()


def translate_to_origin():
    minimum, maximum = scene_bounds()
    center_x = (minimum.x + maximum.x) / 2.0
    center_y = (minimum.y + maximum.y) / 2.0
    floor_z = minimum.z

    for obj in mesh_objects():
        obj.location.x -= center_x
        obj.location.y -= center_y
        obj.location.z -= floor_z

    bpy.context.view_layer.update()


def normalize_to_target_size(target_width_cm, target_height_cm, target_depth_cm):
    minimum, maximum = scene_bounds()
    width = maximum.x - minimum.x
    depth = maximum.y - minimum.y
    height = maximum.z - minimum.z

    if width <= 0 or height <= 0:
        raise RuntimeError("Imported model has invalid bounds.")

    target_width = target_width_cm / 100.0
    target_height = target_height_cm / 100.0
    target_depth = target_depth_cm / 100.0

    scale = min(target_width / width, target_height / height)
    if depth > 0:
        scale = min(scale, (target_depth * 1.5) / depth)

    apply_uniform_scale(scale)
    translate_to_origin()


def orient_to_target(root, target_width_cm, target_height_cm):
    target_ratio = target_width_cm / max(target_height_cm, 0.001)
    candidates = [
        (0.0, 0.0, 0.0),
        (math.radians(90), 0.0, 0.0),
        (math.radians(-90), 0.0, 0.0),
        (0.0, math.radians(90), 0.0),
        (0.0, math.radians(-90), 0.0),
        (0.0, 0.0, math.radians(90)),
        (0.0, 0.0, math.radians(-90)),
        (math.radians(90), 0.0, math.radians(90)),
        (math.radians(-90), 0.0, math.radians(90)),
        (math.radians(90), 0.0, math.radians(-90)),
        (math.radians(-90), 0.0, math.radians(-90)),
    ]

    best_rotation = candidates[0]
    best_score = math.inf

    for rotation in candidates:
        root.rotation_euler = rotation
        bpy.context.view_layer.update()
        minimum, maximum = scene_bounds()
        extent_x = abs(maximum.x - minimum.x)
        extent_y = abs(maximum.y - minimum.y)
        extent_z = abs(maximum.z - minimum.z)

        if min(extent_x, extent_y, extent_z) <= 0:
            continue

        ratio = extent_x / max(extent_z, 0.001)
        min_extent = min(extent_x, extent_y, extent_z)
        depth_penalty = abs(extent_y - min_extent) / max(min_extent, 0.001)
        ratio_penalty = abs(ratio - target_ratio)
        score = ratio_penalty + depth_penalty * 4.0

        if score < best_score:
            best_score = score
            best_rotation = rotation

    root.rotation_euler = best_rotation
    bpy.context.view_layer.update()


def export_glb(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_yup=True,
    )


def main():
    args = parse_args()
    reset_scene()
    import_asset(args.input)
    remove_non_mesh_objects()

    if not mesh_objects():
        raise RuntimeError("No mesh objects were imported.")

    root = create_root_parent()
    orient_to_target(root, args.target_width_cm, args.target_height_cm)
    apply_material_overrides()
    normalize_to_target_size(args.target_width_cm, args.target_height_cm, args.target_depth_cm)
    export_glb(args.output)
    print(f"wrote {args.output}")


if __name__ == "__main__":
    main()
