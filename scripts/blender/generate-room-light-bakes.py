import argparse
import math
import os
import sys

import bpy


ROOM = {
    "width": 4.2,
    "depth": 5.0,
    "height": 2.4,
}

WINDOW = {
    "x": 1.05,
    "y": 1.67,
}


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
    return clamp(perimeter + corner * 0.38 + vignette * 0.12)


def floor_window_wash(u, v):
    x, z = floor_coordinates(u, v)
    depth = ROOM["depth"]
    from_window = clamp((z + depth / 2) / depth)
    beam_center_x = WINDOW["x"] - from_window * 0.72
    beam_width = 0.62 + from_window * 0.72
    beam = gaussian(x, beam_center_x, beam_width) * gaussian(from_window, 0.38, 0.32)
    near_window = gaussian(x, WINDOW["x"], 0.78) * (1.0 - smoothstep(0.0, 1.55, z + depth / 2))
    return clamp(beam * 0.92 + near_window * 0.38)


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
