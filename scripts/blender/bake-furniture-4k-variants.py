import argparse
import json
import math
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
    for image in list(bpy.data.images):
        bpy.data.images.remove(image)
    for material in list(bpy.data.materials):
        bpy.data.materials.remove(material)


def color_tuple(hex_color):
    value = hex_color.lstrip("#")
    return (
        int(value[0:2], 16) / 255,
        int(value[2:4], 16) / 255,
        int(value[4:6], 16) / 255,
        1.0,
    )


def palette_for(variant, material_name):
    kind = variant.get("kind", "neutral")
    name = material_name.lower()

    if "leg" in name or "metal" in name or "steel" in name or kind == "metal":
        return {
            "dark": "#3d3933",
            "mid": "#7d756b",
            "light": "#b1a492",
            "roughness": 0.5,
            "metallic": 0.45,
            "scale": 52,
        }

    if "wood" in name or "shelf" in name or "table" in name or kind in {"wood", "oak"}:
        return {
            "dark": "#8c6944",
            "mid": "#c59d6f",
            "light": "#ead2ad",
            "roughness": 0.62,
            "metallic": 0.0,
            "scale": 32,
        }

    if "fabric" in name or "textile" in name or "seat" in name or "cushion" in name or kind == "fabric":
        return {
            "dark": "#6d6a64",
            "mid": "#969188",
            "light": "#c3bcb0",
            "roughness": 0.9,
            "metallic": 0.0,
            "scale": 86,
        }

    if "plant" in name or "leaf" in name or kind == "plant":
        return {
            "dark": "#334f36",
            "mid": "#5f7e5e",
            "light": "#8fa986",
            "roughness": 0.78,
            "metallic": 0.0,
            "scale": 54,
        }

    if "glass" in name:
        return {
            "dark": "#87949b",
            "mid": "#b7c5cc",
            "light": "#e8f2f4",
            "roughness": 0.25,
            "metallic": 0.0,
            "scale": 22,
        }

    if kind == "ceramic":
        return {
            "dark": "#d8cbb8",
            "mid": "#eee4d7",
            "light": "#fff7ec",
            "roughness": 0.72,
            "metallic": 0.0,
            "scale": 40,
        }

    return {
        "dark": "#a79b8c",
        "mid": "#cfc4b3",
        "light": "#f0e6d6",
        "roughness": 0.72,
        "metallic": 0.0,
        "scale": 38,
    }


def join_meshes(meshes, variant):
    if not meshes:
        return None

    bpy.ops.object.select_all(action="DESELECT")
    active = meshes[0]
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = active
    if len(meshes) > 1:
        bpy.ops.object.join()
    active.name = f"{variant['id']}-mesh"
    active.data.name = f"{variant['id']}-mesh"
    return active


def unwrap_atlas(obj):
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(
        angle_limit=math.radians(66),
        island_margin=0.012,
        area_weight=0.35,
    )
    bpy.ops.object.mode_set(mode="OBJECT")


def make_bake_material(material, image, variant):
    mat = material
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new(type="ShaderNodeOutputMaterial")
    bsdf = nodes.new(type="ShaderNodeBsdfPrincipled")
    noise = nodes.new(type="ShaderNodeTexNoise")
    ramp = nodes.new(type="ShaderNodeValToRGB")
    bake_target = nodes.new(type="ShaderNodeTexImage")

    palette = palette_for(variant, mat.name)
    noise.inputs["Scale"].default_value = palette["scale"]
    noise.inputs["Detail"].default_value = 14
    noise.inputs["Roughness"].default_value = 0.58
    ramp.color_ramp.elements[0].position = 0.22
    ramp.color_ramp.elements[0].color = color_tuple(palette["dark"])
    ramp.color_ramp.elements[1].position = 1.0
    ramp.color_ramp.elements[1].color = color_tuple(palette["light"])
    mid = ramp.color_ramp.elements.new(0.58)
    mid.color = color_tuple(palette["mid"])

    bsdf.inputs["Roughness"].default_value = palette["roughness"]
    bsdf.inputs["Metallic"].default_value = palette["metallic"]
    bake_target.image = image

    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    nodes.active = bake_target
    return bake_target


def apply_baked_material(material, image, variant):
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()

    output = nodes.new(type="ShaderNodeOutputMaterial")
    bsdf = nodes.new(type="ShaderNodeBsdfPrincipled")
    image_node = nodes.new(type="ShaderNodeTexImage")
    palette = palette_for(variant, material.name)

    image_node.image = image
    bsdf.inputs["Roughness"].default_value = palette["roughness"]
    bsdf.inputs["Metallic"].default_value = palette["metallic"]
    links.new(image_node.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])


def apply_single_atlas_material(obj, image, variant):
    material = bpy.data.materials.new(f"{variant['id']}-4k-atlas")
    apply_baked_material(material, image, variant)
    obj.data.materials.clear()
    obj.data.materials.append(material)
    for polygon in obj.data.polygons:
        polygon.material_index = 0


def import_variant(repo_root, source):
    source_path = os.path.join(repo_root, source)
    bpy.ops.import_scene.gltf(filepath=source_path)
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    return meshes


def bake_variant(repo_root, output_dir, variant):
    reset_scene()
    meshes = import_variant(repo_root, variant["source"])
    mesh = join_meshes(meshes, variant)
    if mesh is None:
        raise RuntimeError(f"No mesh objects found in {variant['source']}")
    unwrap_atlas(mesh)

    resolution = int(variant.get("textureSize", 4096))
    safe_id = variant["id"].replace("/", "-")
    image = bpy.data.images.new(
        f"{safe_id}-basecolor-atlas-4k",
        width=resolution,
        height=resolution,
        alpha=False,
    )

    for material in bpy.data.materials:
        make_bake_material(material, image, variant)

    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh

    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 64
    scene.cycles.use_denoising = True
    scene.view_settings.view_transform = "Standard"
    scene.render.bake.margin = 32

    bpy.ops.object.bake(type="DIFFUSE", pass_filter={"COLOR"}, use_clear=True)

    texture_dir = os.path.join(output_dir, "textures")
    os.makedirs(texture_dir, exist_ok=True)
    filename = f"{image.name}.jpg"
    image.filepath_raw = os.path.join(texture_dir, filename)
    image.file_format = "JPEG"
    image.save()
    image.pack()
    apply_single_atlas_material(mesh, image, variant)

    output = os.path.join(output_dir, variant["output"])
    os.makedirs(os.path.dirname(output), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=output,
        export_format="GLB",
        export_materials="EXPORT",
        export_image_format="JPEG",
    )
    print(f"wrote {output}")


def main():
    args = parse_args()
    variants = json.loads(args.variants)
    os.makedirs(args.output_dir, exist_ok=True)
    for variant in variants:
        bake_variant(args.repo_root, args.output_dir, variant)


if __name__ == "__main__":
    main()
