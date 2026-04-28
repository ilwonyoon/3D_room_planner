import argparse
import math
import os
import sys

import bpy


ROOM = {
    "width": 5.4,
    "depth": 5.8,
    "height": 2.72,
}

WINDOW = {
    "x": 0.32,
    "y": 1.45,
}

FLOOR_OCCLUDERS = [
    {"id": "desk", "x": 0.56, "z": -2.08, "rx": 0.64, "rz": 0.92, "strength": 0.2},
    {"id": "desk-chair", "x": 0.56, "z": -1.42, "rx": 0.42, "rz": 0.42, "strength": 0.16},
    {"id": "bookcase-left", "x": -2.02, "z": -2.52, "rx": 0.34, "rz": 0.76, "strength": 0.3},
    {"id": "storage-right", "x": 2.02, "z": -2.22, "rx": 0.78, "rz": 0.34, "strength": 0.24},
    {"id": "lounge-sofa", "x": 0.76, "z": 1.64, "rx": 1.14, "rz": 0.52, "strength": 0.38},
    {"id": "coffee-table", "x": 0.24, "z": 0.44, "rx": 0.66, "rz": 0.42, "strength": 0.18},
    {"id": "reading-chair", "x": -1.38, "z": 0.88, "rx": 0.52, "rz": 0.5, "strength": 0.22},
    {"id": "reading-side-table", "x": -0.92, "z": 1.22, "rx": 0.22, "rz": 0.22, "strength": 0.12},
    {"id": "reading-floor-cushion", "x": -0.96, "z": 0.28, "rx": 0.38, "rz": 0.32, "strength": 0.12},
    {"id": "floor-plant", "x": -2.16, "z": 1.82, "rx": 0.34, "rz": 0.34, "strength": 0.16},
    {"id": "tall-plant-right", "x": 2.2, "z": 0.34, "rx": 0.34, "rz": 0.34, "strength": 0.16},
    {"id": "reading-lamp", "x": -2.22, "z": 0.72, "rx": 0.24, "rz": 0.24, "strength": 0.14},
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


def save_mask(path, width, height, sampler):
    image = bpy.data.images.new(os.path.basename(path), width=width, height=height, alpha=True)
    pixels = [0.0] * (width * height * 4)

    for y in range(height):
        v = y / max(height - 1, 1)
        for x in range(width):
            u = x / max(width - 1, 1)
            value = clamp(sampler(u, v))
            index = (y * width + x) * 4
            pixels[index] = value
            pixels[index + 1] = value
            pixels[index + 2] = value
            pixels[index + 3] = 1.0

    image.pixels.foreach_set(pixels)
    image.filepath_raw = path
    image.file_format = "PNG"
    image.save()


def floor_coordinates(u, v):
    x = (u - 0.5) * ROOM["width"]
    z = (v - 0.5) * ROOM["depth"]
    return x, z


def floor_static_ao(u, v):
    x, z = floor_coordinates(u, v)
    width = ROOM["width"]
    depth = ROOM["depth"]
    back = 1.0 - smoothstep(0.0, 0.7, z + depth / 2)
    left = 1.0 - smoothstep(0.0, 0.62, x + width / 2)
    right = 1.0 - smoothstep(0.0, 0.5, width / 2 - x)
    front = 1.0 - smoothstep(0.0, 0.55, depth / 2 - z)
    corner = back * left
    perimeter = max(back * 0.72, left * 0.42, right * 0.18, front * 0.1)
    vignette = smoothstep(1.55, 3.05, math.sqrt((x * 0.88) ** 2 + (z * 0.58) ** 2))
    furniture = 0.0
    for occluder in FLOOR_OCCLUDERS:
        furniture = max(
            furniture,
            elliptical_gaussian(x, z, occluder["x"], occluder["z"], occluder["rx"], occluder["rz"]) * occluder["strength"],
        )
    return clamp(perimeter + corner * 0.38 + vignette * 0.12 + furniture)


def floor_window_wash(u, v):
    x, z = floor_coordinates(u, v)
    depth = ROOM["depth"]
    from_window = clamp((z + depth / 2) / depth)
    beam_center_x = WINDOW["x"] - from_window * 0.58
    beam_width = 0.78 + from_window * 0.92
    beam = gaussian(x, beam_center_x, beam_width) * gaussian(from_window, 0.36, 0.34)
    near_window = gaussian(x, WINDOW["x"], 0.92) * (1.0 - smoothstep(0.0, 1.72, z + depth / 2))
    furniture_shadow = 0.0
    for occluder in FLOOR_OCCLUDERS:
        furniture_shadow = max(
            furniture_shadow,
            elliptical_gaussian(
                x,
                z,
                occluder["x"] + 0.1,
                occluder["z"] + 0.14,
                occluder["rx"] * 1.12,
                occluder["rz"] * 1.18,
            ) * occluder["strength"] * 0.52,
        )
    return clamp((beam * 0.92 + near_window * 0.38) * (1.0 - furniture_shadow))


def back_wall_glow(u, v):
    x = (u - 0.5) * ROOM["width"]
    y = v * ROOM["height"]
    around_window = gaussian(x, WINDOW["x"], 1.08) * gaussian(y, WINDOW["y"], 0.74)
    upper_bounce = gaussian(x, WINDOW["x"] - 0.2, 1.45) * gaussian(y, 2.05, 0.56)
    return clamp(around_window * 0.92 + upper_bounce * 0.36)


def width_wall_static_ao(u, v):
    x = (u - 0.5) * ROOM["width"]
    y = v * ROOM["height"]
    left_corner = 1.0 - smoothstep(0.0, 0.48, x + ROOM["width"] / 2)
    right_corner = 1.0 - smoothstep(0.0, 0.48, ROOM["width"] / 2 - x)
    floor_line = 1.0 - smoothstep(0.0, 0.38, y)
    ceiling_line = smoothstep(1.98, ROOM["height"], y) * 0.22
    return clamp(max(left_corner, right_corner) * 0.24 + floor_line * 0.34 + ceiling_line)


def left_wall_ao(u, v):
    z = (u - 0.5) * ROOM["depth"]
    y = v * ROOM["height"]
    back_corner = 1.0 - smoothstep(0.0, 0.82, z + ROOM["depth"] / 2)
    floor_line = 1.0 - smoothstep(0.0, 0.4, y)
    ceiling_line = smoothstep(1.92, ROOM["height"], y) * 0.36
    return clamp(back_corner * 0.62 + floor_line * 0.26 + ceiling_line)


def right_wall_ao(u, v):
    z = (u - 0.5) * ROOM["depth"]
    y = v * ROOM["height"]
    back_corner = 1.0 - smoothstep(0.0, 0.68, z + ROOM["depth"] / 2)
    front_corner = 1.0 - smoothstep(0.0, 0.44, ROOM["depth"] / 2 - z)
    floor_line = 1.0 - smoothstep(0.0, 0.34, y)
    ceiling_line = smoothstep(1.96, ROOM["height"], y) * 0.24
    return clamp(back_corner * 0.42 + front_corner * 0.18 + floor_line * 0.24 + ceiling_line)


def main():
    args = parse_args()
    os.makedirs(args.output_dir, exist_ok=True)

    outputs = [
        ("floor-static-ao.png", 1024, 1024, floor_static_ao),
        ("floor-window-wash.png", 1024, 1024, floor_window_wash),
        ("back-wall-static-ao.png", 1024, 512, width_wall_static_ao),
        ("back-wall-window-glow.png", 1024, 512, back_wall_glow),
        ("left-wall-static-ao.png", 1024, 512, left_wall_ao),
        ("right-wall-static-ao.png", 1024, 512, right_wall_ao),
        ("front-wall-static-ao.png", 1024, 512, width_wall_static_ao),
    ]

    for filename, width, height, sampler in outputs:
        path = os.path.join(args.output_dir, filename)
        save_mask(path, width, height, sampler)
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
