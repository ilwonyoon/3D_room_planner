import argparse
import os
import sys

import bpy
from mathutils import Vector


ROOM = {"width": 4.2, "depth": 5.0, "height": 2.4}


def parse_args():
    parser = argparse.ArgumentParser()
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


def material(name, color, roughness=0.75, metallic=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


def add_box(name, location, scale, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return obj


def add_plane(name, vertices, mat):
    mesh = bpy.data.meshes.new(name + "Mesh")
    mesh.from_pydata(vertices, [], [(0, 1, 2, 3)])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)

    uv_layer = mesh.uv_layers.new(name="LightmapUV")
    for loop in mesh.loops:
      vertex = mesh.vertices[loop.vertex_index].co
      uv_layer.data[loop.index].uv = ((vertex.x + ROOM["width"] / 2) / ROOM["width"], (vertex.z + ROOM["depth"] / 2) / ROOM["depth"])
    return obj


def main():
    args = parse_args()
    reset_scene()
    os.makedirs(os.path.dirname(args.output), exist_ok=True)

    floor_mat = material("shell_floor_pbr_lightmap_ready", (0.62, 0.47, 0.34, 1), 0.72)
    wall_mat = material("shell_wall_pbr_lightmap_ready", (0.83, 0.80, 0.76, 1), 0.86)
    trim_mat = material("shell_trim_satin", (0.83, 0.80, 0.74, 1), 0.58)
    glass_mat = material("shell_window_night_capable_glass", (0.22, 0.32, 0.4, 0.62), 0.18)

    w = ROOM["width"]
    d = ROOM["depth"]
    h = ROOM["height"]
    floor_y = 0

    add_plane("floor_lightmap_surface", [Vector((-w/2, floor_y, -d/2)), Vector((w/2, floor_y, -d/2)), Vector((w/2, floor_y, d/2)), Vector((-w/2, floor_y, d/2))], floor_mat)
    add_plane("back_wall_lightmap_surface", [Vector((-w/2, 0, -d/2)), Vector((w/2, 0, -d/2)), Vector((w/2, h, -d/2)), Vector((-w/2, h, -d/2))], wall_mat)
    add_plane("left_wall_lightmap_surface", [Vector((-w/2, 0, d/2)), Vector((-w/2, 0, -d/2)), Vector((-w/2, h, -d/2)), Vector((-w/2, h, d/2))], wall_mat)

    add_box("front_open_edge_baseboard", (0, 0.045, d/2 - 0.035), (w + 0.08, 0.09, 0.07), trim_mat)
    add_box("right_open_edge_baseboard", (w/2 - 0.035, 0.045, 0), (0.07, 0.09, d + 0.08), trim_mat)
    add_box("back_baseboard", (0, 0.045, -d/2 + 0.035), (w + 0.08, 0.09, 0.07), trim_mat)
    add_box("left_baseboard", (-w/2 + 0.035, 0.045, 0), (0.07, 0.09, d + 0.08), trim_mat)

    window_center = (1.05, 1.67, -d/2 + 0.035)
    add_box("window_frame_top", (window_center[0], window_center[1] + 0.49, window_center[2]), (1.58, 0.055, 0.06), trim_mat)
    add_box("window_frame_bottom", (window_center[0], window_center[1] - 0.49, window_center[2]), (1.58, 0.055, 0.06), trim_mat)
    add_box("window_frame_left", (window_center[0] - 0.79, window_center[1], window_center[2]), (0.055, 0.98, 0.06), trim_mat)
    add_box("window_frame_right", (window_center[0] + 0.79, window_center[1], window_center[2]), (0.055, 0.98, 0.06), trim_mat)
    add_box("window_glass_proxy", window_center, (1.43, 0.84, 0.018), glass_mat)

    bpy.ops.export_scene.gltf(
        filepath=args.output,
        export_format="GLB",
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
    )
    print(f"wrote {args.output}")


if __name__ == "__main__":
    main()
