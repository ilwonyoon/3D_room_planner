import argparse
import math
import os
import sys
import tempfile

import bpy
from mathutils import Vector


ROOM = {
    "width": 5.4,
    "depth": 5.8,
    "height": 2.72,
}

WINDOW = {
    "x": 0.32,
    "z": -2.84,
    "y": 1.45,
}

FLOOR_OCCLUDERS = [
    {"id": "desk", "x": 0.24, "z": -2.08, "sx": 1.72, "sz": 0.82, "height": 0.74},
    {"id": "desk-chair", "x": 0.24, "z": -1.08, "sx": 0.58, "sz": 0.58, "height": 0.86},
    {"id": "bookcase-left", "x": -2.02, "z": -2.52, "sx": 0.5, "sz": 1.04, "height": 1.98},
    {"id": "storage-right", "x": 2.02, "z": -2.22, "sx": 1.18, "sz": 0.44, "height": 0.86},
    {"id": "lounge-sofa", "x": 0.76, "z": 1.64, "sx": 2.2, "sz": 0.9, "height": 0.72},
    {"id": "coffee-table", "x": 0.24, "z": 0.44, "sx": 1.0, "sz": 0.62, "height": 0.26},
    {"id": "reading-chair", "x": -1.38, "z": 0.88, "sx": 0.78, "sz": 0.72, "height": 0.82},
    {"id": "reading-side-table", "x": -0.92, "z": 1.22, "sx": 0.34, "sz": 0.34, "height": 0.48},
    {"id": "reading-floor-cushion", "x": -0.96, "z": 0.28, "sx": 0.68, "sz": 0.48, "height": 0.12},
    {"id": "floor-plant", "x": -2.16, "z": 1.82, "sx": 0.44, "sz": 0.44, "height": 0.78},
    {"id": "tall-plant-right", "x": 2.2, "z": 0.34, "sx": 0.48, "sz": 0.48, "height": 1.18},
    {"id": "reading-lamp", "x": -2.22, "z": 0.72, "sx": 0.22, "sz": 0.22, "height": 1.9},
]


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", required=True)
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
    for world in list(bpy.data.worlds):
        bpy.data.worlds.remove(world)


def clamp(value, minimum=0.0, maximum=1.0):
    return max(minimum, min(maximum, value))


def smoothstep(edge0, edge1, value):
    if edge0 == edge1:
        return 1.0 if value >= edge1 else 0.0
    t = clamp((value - edge0) / (edge1 - edge0))
    return t * t * (3.0 - 2.0 * t)


def gaussian(value, center, width):
    return math.exp(-((value - center) ** 2) / max(width * width, 0.0001))


def elliptical_gaussian(x, z, center_x, center_z, radius_x, radius_z):
    dx = (x - center_x) / max(radius_x, 0.0001)
    dz = (z - center_z) / max(radius_z, 0.0001)
    return math.exp(-(dx * dx + dz * dz))


def configure_cycles(width, height):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 96
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 4
    scene.cycles.diffuse_bounces = 2
    scene.cycles.glossy_bounces = 1
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.film_transparent = False
    world = bpy.data.worlds.new("mask-world")
    world.color = (0, 0, 0)
    scene.world = world


def material(name, color, roughness=0.95):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = 0
    return mat


def shadow_proxy_material(name="shadow proxy camera transparent"):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    for node in list(nodes):
        nodes.remove(node)

    output = nodes.new(type="ShaderNodeOutputMaterial")
    light_path = nodes.new(type="ShaderNodeLightPath")
    transparent = nodes.new(type="ShaderNodeBsdfTransparent")
    diffuse = nodes.new(type="ShaderNodeBsdfDiffuse")
    mix = nodes.new(type="ShaderNodeMixShader")

    diffuse.inputs["Color"].default_value = (0.01, 0.008, 0.006, 1)
    diffuse.inputs["Roughness"].default_value = 1

    links.new(light_path.outputs["Is Camera Ray"], mix.inputs["Fac"])
    links.new(diffuse.outputs["BSDF"], mix.inputs[1])
    links.new(transparent.outputs["BSDF"], mix.inputs[2])
    links.new(mix.outputs["Shader"], output.inputs["Surface"])
    return mat


def add_box(name, location, scale, mat, hidden_from_camera=False):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    obj.visible_camera = not hidden_from_camera
    obj.visible_shadow = True
    return obj


def add_floor_and_walls(floor_mat, wall_mat, hidden_walls=False):
    width = ROOM["width"]
    depth = ROOM["depth"]
    height = ROOM["height"]
    wall_shadow_mat = shadow_proxy_material("wall shadow camera transparent") if hidden_walls else wall_mat
    add_box("floor-receiver", (0, 0, -0.01), (width, depth, 0.02), floor_mat)
    add_box("back-wall-occluder", (0, -depth / 2, height / 2), (width, 0.06, height), wall_shadow_mat, hidden_walls)
    add_box("front-wall-occluder", (0, depth / 2, height / 2), (width, 0.06, height), wall_shadow_mat, hidden_walls)
    add_box("left-wall-occluder", (-width / 2, 0, height / 2), (0.06, depth, height), wall_shadow_mat, hidden_walls)
    add_box("right-wall-occluder", (width / 2, 0, height / 2), (0.06, depth, height), wall_shadow_mat, hidden_walls)


def add_occluder_boxes(hidden_from_camera=True):
    mat = shadow_proxy_material()
    for item in FLOOR_OCCLUDERS:
        add_box(
            f"{item['id']}-shadow-proxy",
            (item["x"], item["z"], item["height"] / 2),
            (item["sx"], item["sz"], item["height"]),
            mat,
            hidden_from_camera,
        )


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_top_camera(width, height):
    bpy.ops.object.camera_add(location=(0, 0, 8.2))
    camera = bpy.context.object
    camera.name = "floor-mask-camera"
    look_at(camera, (0, 0, 0))
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = max(ROOM["width"], ROOM["depth"])
    bpy.context.scene.camera = camera
    configure_cycles(width, height)


def add_wall_camera(side, width, height):
    room_width = ROOM["width"]
    room_depth = ROOM["depth"]
    room_height = ROOM["height"]
    if side in {"back", "front"}:
        y = -room_depth / 2 - 6 if side == "back" else room_depth / 2 + 6
        target_y = -room_depth / 2 if side == "back" else room_depth / 2
        bpy.ops.object.camera_add(location=(0, y, room_height / 2))
        camera = bpy.context.object
        look_at(camera, (0, target_y, room_height / 2))
        camera.data.type = "ORTHO"
        camera.data.ortho_scale = room_width
    else:
        x = -room_width / 2 - 6 if side == "left" else room_width / 2 + 6
        target_x = -room_width / 2 if side == "left" else room_width / 2
        bpy.ops.object.camera_add(location=(x, 0, room_height / 2))
        camera = bpy.context.object
        look_at(camera, (target_x, 0, room_height / 2))
        camera.data.type = "ORTHO"
        camera.data.ortho_scale = room_depth
    camera.name = f"{side}-wall-mask-camera"
    bpy.context.scene.camera = camera
    configure_cycles(width, height)


def add_overhead_light():
    bpy.ops.object.light_add(type="AREA", location=(0, 0, 5.6))
    light = bpy.context.object
    light.name = "large overhead mask softbox"
    light.data.energy = 620
    light.data.size = 6.2
    look_at(light, (0, 0, 0))


def add_window_key_light():
    bpy.ops.object.light_add(type="AREA", location=(WINDOW["x"], WINDOW["z"] - 0.18, WINDOW["y"] + 0.2))
    light = bpy.context.object
    light.name = "window mask key"
    light.data.energy = 980
    light.data.size = 1.75
    look_at(light, (-0.28, -0.46, 0.1))


def render_to_pixels(width, height):
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        path = tmp.name
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    image = bpy.data.images.load(path)
    pixels = list(image.pixels)
    bpy.data.images.remove(image)
    try:
        os.remove(path)
    except OSError:
        pass
    luminance = []
    for index in range(0, len(pixels), 4):
        r, g, b = pixels[index], pixels[index + 1], pixels[index + 2]
        luminance.append(r * 0.2126 + g * 0.7152 + b * 0.0722)
    return luminance


def save_mask(path, width, height, values):
    image = bpy.data.images.new(os.path.basename(path), width=width, height=height, alpha=True)
    pixels = [0.0] * (width * height * 4)
    for index, value in enumerate(values):
        v = clamp(value)
        offset = index * 4
        pixels[offset] = v
        pixels[offset + 1] = v
        pixels[offset + 2] = v
        pixels[offset + 3] = 1.0
    image.pixels.foreach_set(pixels)
    image.filepath_raw = path
    image.file_format = "PNG"
    image.save()
    bpy.data.images.remove(image)


def normalized(values, floor=0.0, ceiling=1.0):
    lo = min(values)
    hi = max(values)
    span = max(hi - lo, 0.0001)
    return [floor + (clamp((value - lo) / span) * (ceiling - floor)) for value in values]


def floor_coordinates(pixel_index, width, height):
    x = (pixel_index % width) / max(width - 1, 1)
    y = (pixel_index // width) / max(height - 1, 1)
    return (x - 0.5) * ROOM["width"], (y - 0.5) * ROOM["depth"]


def perimeter_floor_ao(pixel_index, width, height):
    x, z = floor_coordinates(pixel_index, width, height)
    back = 1.0 - smoothstep(0.0, 0.64, z + ROOM["depth"] / 2)
    left = 1.0 - smoothstep(0.0, 0.5, x + ROOM["width"] / 2)
    right = 1.0 - smoothstep(0.0, 0.44, ROOM["width"] / 2 - x)
    front = 1.0 - smoothstep(0.0, 0.48, ROOM["depth"] / 2 - z)
    return max(back * 0.58, left * 0.28, right * 0.14, front * 0.08)


def furniture_contact_ao(pixel_index, width, height):
    x, z = floor_coordinates(pixel_index, width, height)
    value = 0.0
    for item in FLOOR_OCCLUDERS:
        area = item["sx"] * item["sz"]
        value = max(
            value,
            elliptical_gaussian(x, z, item["x"], item["z"], item["sx"] * 0.52, item["sz"] * 0.52)
            * min(0.28, 0.08 + area * 0.05),
        )
    return value


def generate_floor_static_ao(output_dir):
    width = 1024
    height = 1024
    mask = [
        clamp(perimeter_floor_ao(index, width, height) + furniture_contact_ao(index, width, height))
        for index in range(width * height)
    ]
    save_mask(os.path.join(output_dir, "floor-static-ao.png"), width, height, mask)


def generate_floor_window_wash(output_dir):
    width = 1024
    height = 1024
    mask = []
    for index in range(width * height):
        x, z = floor_coordinates(index, width, height)
        depth_progress = clamp((z + ROOM["depth"] / 2) / ROOM["depth"])
        beam_center_x = WINDOW["x"] - depth_progress * 0.56
        beam = gaussian(x, beam_center_x, 0.84 + depth_progress * 1.05) * gaussian(depth_progress, 0.34, 0.34)
        near_window = gaussian(x, WINDOW["x"], 0.92) * (1.0 - smoothstep(0.0, 1.7, z + ROOM["depth"] / 2))
        sofa_shadow = elliptical_gaussian(x, z, 0.76, 1.64, 1.4, 0.7) * 0.18
        desk_shadow = elliptical_gaussian(x, z, 0.24, -2.08, 1.0, 0.5) * 0.2
        occlusion = clamp(sofa_shadow + desk_shadow)
        mask.append(clamp((beam * 0.84 + near_window * 0.36) * (1.0 - occlusion)))
    save_mask(os.path.join(output_dir, "floor-window-wash.png"), width, height, mask)


def wall_static_value(side, pixel_index, width, height):
    u = (pixel_index % width) / max(width - 1, 1)
    v = (pixel_index // width) / max(height - 1, 1)
    y = v * ROOM["height"]
    if side in {"back", "front"}:
        x = (u - 0.5) * ROOM["width"]
        left_corner = 1.0 - smoothstep(0.0, 0.48, x + ROOM["width"] / 2)
        right_corner = 1.0 - smoothstep(0.0, 0.48, ROOM["width"] / 2 - x)
        floor_line = 1.0 - smoothstep(0.0, 0.36, y)
        ceiling_line = smoothstep(1.95, ROOM["height"], y) * 0.22
        return clamp(max(left_corner, right_corner) * 0.24 + floor_line * 0.3 + ceiling_line)
    z = (u - 0.5) * ROOM["depth"]
    back_corner = 1.0 - smoothstep(0.0, 0.76, z + ROOM["depth"] / 2)
    front_corner = 1.0 - smoothstep(0.0, 0.44, ROOM["depth"] / 2 - z)
    floor_line = 1.0 - smoothstep(0.0, 0.38, y)
    ceiling_line = smoothstep(1.92, ROOM["height"], y) * 0.28
    return clamp(back_corner * (0.56 if side == "left" else 0.38) + front_corner * 0.16 + floor_line * 0.24 + ceiling_line)


def generate_wall_static_ao(output_dir, side, filename):
    width = 1024
    height = 512
    values = [wall_static_value(side, index, width, height) for index in range(width * height)]
    save_mask(os.path.join(output_dir, filename), width, height, values)


def generate_back_wall_window_glow(output_dir):
    width = 1024
    height = 512
    values = []
    for index in range(width * height):
        u = (index % width) / max(width - 1, 1)
        v = (index // width) / max(height - 1, 1)
        x = (u - 0.5) * ROOM["width"]
        y = v * ROOM["height"]
        around_window = gaussian(x, WINDOW["x"], 1.02) * gaussian(y, WINDOW["y"], 0.66)
        upper_bounce = gaussian(x, WINDOW["x"] - 0.2, 1.45) * gaussian(y, 2.02, 0.56)
        floor_bounce = gaussian(x, WINDOW["x"] - 0.38, 1.7) * gaussian(y, 0.58, 0.72)
        values.append(clamp(around_window * 0.86 + upper_bounce * 0.3 + floor_bounce * 0.13))
    save_mask(os.path.join(output_dir, "back-wall-window-glow.png"), width, height, values)


def main():
    args = parse_args()
    os.makedirs(args.output_dir, exist_ok=True)

    generate_floor_static_ao(args.output_dir)
    print(f"wrote {os.path.join(args.output_dir, 'floor-static-ao.png')}")
    generate_floor_window_wash(args.output_dir)
    print(f"wrote {os.path.join(args.output_dir, 'floor-window-wash.png')}")
    generate_wall_static_ao(args.output_dir, "back", "back-wall-static-ao.png")
    print(f"wrote {os.path.join(args.output_dir, 'back-wall-static-ao.png')}")
    generate_back_wall_window_glow(args.output_dir)
    print(f"wrote {os.path.join(args.output_dir, 'back-wall-window-glow.png')}")
    generate_wall_static_ao(args.output_dir, "left", "left-wall-static-ao.png")
    print(f"wrote {os.path.join(args.output_dir, 'left-wall-static-ao.png')}")
    generate_wall_static_ao(args.output_dir, "right", "right-wall-static-ao.png")
    print(f"wrote {os.path.join(args.output_dir, 'right-wall-static-ao.png')}")
    generate_wall_static_ao(args.output_dir, "front", "front-wall-static-ao.png")
    print(f"wrote {os.path.join(args.output_dir, 'front-wall-static-ao.png')}")


if __name__ == "__main__":
    main()
