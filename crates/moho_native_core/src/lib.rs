use napi_derive::napi;
use serde::{Deserialize, Serialize};
use flate2::write::DeflateEncoder;
use flate2::Compression;
use crc32fast::Hasher;
use std::io::Write;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[napi(object)]
pub struct NativePoint2D {
  pub x: f64,
  pub y: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[napi(object)]
pub struct NativeBezierHandle {
  pub dx: f64,
  pub dy: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[napi(object)]
pub struct NativeVectorPoint {
  pub x: f64,
  pub y: f64,
  pub handle_in: Option<NativeBezierHandle>,
  pub handle_out: Option<NativeBezierHandle>,
  pub curvature: Option<f64>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[napi(object)]
pub struct NativeRgba {
  pub r: u32,
  pub g: u32,
  pub b: u32,
  pub a: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[napi(object)]
pub struct NativeVectorShape {
  pub name: String,
  pub points: Vec<NativeVectorPoint>,
  pub fill_color: NativeRgba,
  pub stroke_color: NativeRgba,
  pub stroke_width: f64,
  pub is_closed: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[napi(object)]
pub struct NativeTriangle {
  pub p1: u32,
  pub p2: u32,
  pub p3: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[napi(object)]
pub struct NativeSmartMeshResult {
  pub mesh_layer_name: String,
  pub target_layer_name: String,
  pub points: Vec<NativePoint2D>,
  pub triangles: Vec<NativeTriangle>,
  pub point_count: u32,
  pub triangle_count: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[napi(object)]
pub struct NativeTrajectoryKeyframe {
  pub frame: f64,
  pub pos_x: f64,
  pub pos_y: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[napi(object)]
pub struct NativeDynamicSquashKeyframe {
  pub frame: f64,
  pub squash_angle_deg: f64,
  pub scale_x: f64,
  pub scale_y: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[napi(object)]
pub struct NativeZipEntry {
  pub name: String,
  pub content: Vec<u8>,
}

// Minimal 1x1 valid JPEG for .moho preview container
const MINIMAL_JPEG: &[u8] = &[
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
  0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
  0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
  0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
  0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
  0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
  0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
  0x00, 0xbf, 0x80, 0xff, 0xd9
];

/// 1. Native High-Speed Ramer-Douglas-Peucker (RDP) Contour Simplification
#[napi]
pub fn rust_simplify_contour(points: Vec<NativePoint2D>, epsilon: f64) -> Vec<NativePoint2D> {
  if points.len() <= 2 {
    return points;
  }

  let mut dmax = 0.0;
  let mut index = 0;
  let end = points.len() - 1;

  for i in 1..end {
    let d = perpendicular_distance(&points[i], &points[0], &points[end]);
    if d > dmax {
      index = i;
      dmax = d;
    }
  }

  if dmax > epsilon {
    let mut rec1 = rust_simplify_contour(points[0..=index].to_vec(), epsilon);
    let rec2 = rust_simplify_contour(points[index..=end].to_vec(), epsilon);
    rec1.pop();
    rec1.extend(rec2);
    rec1
  } else {
    vec![points[0].clone(), points[end].clone()]
  }
}

fn perpendicular_distance(p: &NativePoint2D, p1: &NativePoint2D, p2: &NativePoint2D) -> f64 {
  let dx = p2.x - p1.x;
  let dy = p2.y - p1.y;
  let mag = (dx * dx + dy * dy).sqrt();
  if mag == 0.0 {
    return ((p.x - p1.x).powi(2) + (p.y - p1.y).powi(2)).sqrt();
  }
  ((dy * p.x - dx * p.y + p2.x * p1.y - p2.y * p1.x).abs()) / mag
}

/// 2. Native Bezier Handle Curve Fitting
#[napi]
pub fn rust_fit_bezier_handles(points: Vec<NativePoint2D>, tension: f64) -> Vec<NativeVectorPoint> {
  let n = points.len();
  if n == 0 {
    return Vec::new();
  }
  if n == 1 {
    return vec![NativeVectorPoint {
      x: points[0].x,
      y: points[0].y,
      handle_in: None,
      handle_out: None,
      curvature: Some(0.0),
    }];
  }

  let mut result = Vec::with_capacity(n);
  for i in 0..n {
    let prev = &points[(i + n - 1) % n];
    let curr = &points[i];
    let next = &points[(i + 1) % n];

    let vx = next.x - prev.x;
    let vy = next.y - prev.y;

    result.push(NativeVectorPoint {
      x: (curr.x * 100.0).round() / 100.0,
      y: (curr.y * 100.0).round() / 100.0,
      handle_in: Some(NativeBezierHandle {
        dx: (-vx * tension * 100.0).round() / 100.0,
        dy: (-vy * tension * 100.0).round() / 100.0,
      }),
      handle_out: Some(NativeBezierHandle {
        dx: (vx * tension * 100.0).round() / 100.0,
        dy: (vy * tension * 100.0).round() / 100.0,
      }),
      curvature: Some(0.35),
    });
  }

  result
}

/// 3. Native Cartoon Capsule Shape Generator with +15% Joint Inpainting Padding
#[napi]
pub fn rust_generate_capsule_shape(
  name: String,
  center_x: f64,
  center_y: f64,
  radius_x: f64,
  radius_y: f64,
  fill_rgba: Vec<u32>,
  stroke_width: f64,
  joint_cap_padding: bool,
) -> NativeVectorShape {
  let rx = if joint_cap_padding { radius_x * 1.15 } else { radius_x };
  let ry = radius_y;
  let cx = center_x;
  let cy = center_y;
  let kappa = 0.552284749831;

  let points = vec![
    NativeVectorPoint {
      x: cx,
      y: cy + ry,
      handle_in: Some(NativeBezierHandle { dx: -rx * kappa, dy: 0.0 }),
      handle_out: Some(NativeBezierHandle { dx: rx * kappa, dy: 0.0 }),
      curvature: Some(0.35),
    },
    NativeVectorPoint {
      x: cx + rx * 0.7,
      y: cy + ry * 0.7,
      handle_in: Some(NativeBezierHandle { dx: -rx * 0.3, dy: ry * 0.3 }),
      handle_out: Some(NativeBezierHandle { dx: rx * 0.3, dy: -ry * 0.3 }),
      curvature: Some(0.35),
    },
    NativeVectorPoint {
      x: cx + rx,
      y: cy,
      handle_in: Some(NativeBezierHandle { dx: 0.0, dy: ry * kappa }),
      handle_out: Some(NativeBezierHandle { dx: 0.0, dy: -ry * kappa }),
      curvature: Some(0.35),
    },
    NativeVectorPoint {
      x: cx + rx * 0.7,
      y: cy - ry * 0.7,
      handle_in: Some(NativeBezierHandle { dx: rx * 0.3, dy: ry * 0.3 }),
      handle_out: Some(NativeBezierHandle { dx: -rx * 0.3, dy: -ry * 0.3 }),
      curvature: Some(0.35),
    },
    NativeVectorPoint {
      x: cx,
      y: cy - ry,
      handle_in: Some(NativeBezierHandle { dx: rx * kappa, dy: 0.0 }),
      handle_out: Some(NativeBezierHandle { dx: -rx * kappa, dy: 0.0 }),
      curvature: Some(0.35),
    },
    NativeVectorPoint {
      x: cx - rx * 0.7,
      y: cy - ry * 0.7,
      handle_in: Some(NativeBezierHandle { dx: rx * 0.3, dy: -ry * 0.3 }),
      handle_out: Some(NativeBezierHandle { dx: -rx * 0.3, dy: ry * 0.3 }),
      curvature: Some(0.35),
    },
    NativeVectorPoint {
      x: cx - rx,
      y: cy,
      handle_in: Some(NativeBezierHandle { dx: 0.0, dy: -ry * kappa }),
      handle_out: Some(NativeBezierHandle { dx: 0.0, dy: ry * kappa }),
      curvature: Some(0.35),
    },
    NativeVectorPoint {
      x: cx - rx * 0.7,
      y: cy + ry * 0.7,
      handle_in: Some(NativeBezierHandle { dx: -rx * 0.3, dy: -ry * 0.3 }),
      handle_out: Some(NativeBezierHandle { dx: rx * 0.3, dy: ry * 0.3 }),
      curvature: Some(0.35),
    },
  ];

  let r = *fill_rgba.get(0).unwrap_or(&240);
  let g = *fill_rgba.get(1).unwrap_or(&215);
  let b = *fill_rgba.get(2).unwrap_or(&195);
  let a = *fill_rgba.get(3).unwrap_or(&255);

  NativeVectorShape {
    name,
    points,
    fill_color: NativeRgba { r, g, b, a },
    stroke_color: NativeRgba { r: 26, g: 26, b: 26, a: 255 },
    stroke_width,
    is_closed: true,
  }
}

/// 4. Native Delaunay Triangulation & Smart Mesh Generator
#[napi]
pub fn rust_generate_delaunay_mesh(
  mesh_layer_name: String,
  target_layer_name: String,
  min_x: f64,
  min_y: f64,
  max_x: f64,
  max_y: f64,
  subdiv_x: u32,
  subdiv_y: u32,
) -> NativeSmartMeshResult {
  let mut points = Vec::new();
  let step_x = (max_x - min_x) / (subdiv_x as f64);
  let step_y = (max_y - min_y) / (subdiv_y as f64);

  for j in 0..=subdiv_y {
    for i in 0..=subdiv_x {
      points.push(NativePoint2D {
        x: ((min_x + (i as f64) * step_x) * 100.0).round() / 100.0,
        y: ((min_y + (j as f64) * step_y) * 100.0).round() / 100.0,
      });
    }
  }

  let mut triangles = Vec::new();
  let cols = subdiv_x + 1;

  for j in 0..subdiv_y {
    for i in 0..subdiv_x {
      let top_left = j * cols + i;
      let top_right = top_left + 1;
      let bottom_left = (j + 1) * cols + i;
      let bottom_right = bottom_left + 1;

      triangles.push(NativeTriangle { p1: top_left, p2: bottom_left, p3: top_right });
      triangles.push(NativeTriangle { p1: top_right, p2: bottom_left, p3: bottom_right });
    }
  }

  let point_count = points.len() as u32;
  let triangle_count = triangles.len() as u32;

  NativeSmartMeshResult {
    mesh_layer_name,
    target_layer_name,
    points,
    triangles,
    point_count,
    triangle_count,
  }
}

/// 5. Native High-Throughput Binary .moho ZIP Archive Compiler
#[napi]
pub fn rust_compile_moho_zip(json_content: String) -> Vec<u8> {
  let json_bytes = json_content.as_bytes();
  let entries = vec![
    ("Project.mohoproj", json_bytes),
    ("preview.jpg", MINIMAL_JPEG),
  ];

  let mut local_headers: Vec<u8> = Vec::new();
  let mut central_headers: Vec<u8> = Vec::new();
  let mut offset: u32 = 0;

  for (filename, raw_data) in entries {
    let name_bytes = filename.as_bytes();
    
    // Deflate compression
    let mut encoder = DeflateEncoder::new(Vec::new(), Compression::default());
    encoder.write_all(raw_data).unwrap();
    let compressed_data = encoder.finish().unwrap();

    // CRC32 calculation
    let mut hasher = Hasher::new();
    hasher.update(raw_data);
    let crc = hasher.finalize();

    let uncompressed_size = raw_data.len() as u32;
    let compressed_size = compressed_data.len() as u32;
    let name_len = name_bytes.len() as u16;

    // Local Header (30 bytes + name + payload)
    let mut local = Vec::with_capacity(30 + name_bytes.len() + compressed_data.len());
    local.extend_from_slice(&0x04034b50u32.to_le_bytes()); // Local header signature
    local.extend_from_slice(&20u16.to_le_bytes());        // Version needed (2.0)
    local.extend_from_slice(&0u16.to_le_bytes());         // Flags
    local.extend_from_slice(&8u16.to_le_bytes());         // Compression method (Deflate)
    local.extend_from_slice(&0u16.to_le_bytes());         // Mod time
    local.extend_from_slice(&0u16.to_le_bytes());         // Mod date
    local.extend_from_slice(&crc.to_le_bytes());          // CRC32
    local.extend_from_slice(&compressed_size.to_le_bytes());
    local.extend_from_slice(&uncompressed_size.to_le_bytes());
    local.extend_from_slice(&name_len.to_le_bytes());
    local.extend_from_slice(&0u16.to_le_bytes());         // Extra field len
    local.extend_from_slice(name_bytes);
    local.extend_from_slice(&compressed_data);

    // Central Directory Header (46 bytes + name)
    let mut central = Vec::with_capacity(46 + name_bytes.len());
    central.extend_from_slice(&0x02014b50u32.to_le_bytes()); // Central dir signature
    central.extend_from_slice(&20u16.to_le_bytes());        // Version made by
    central.extend_from_slice(&20u16.to_le_bytes());        // Version needed
    central.extend_from_slice(&0u16.to_le_bytes());         // Flags
    central.extend_from_slice(&8u16.to_le_bytes());         // Compression method (Deflate)
    central.extend_from_slice(&0u16.to_le_bytes());         // Mod time
    central.extend_from_slice(&0u16.to_le_bytes());         // Mod date
    central.extend_from_slice(&crc.to_le_bytes());
    central.extend_from_slice(&compressed_size.to_le_bytes());
    central.extend_from_slice(&uncompressed_size.to_le_bytes());
    central.extend_from_slice(&name_len.to_le_bytes());
    central.extend_from_slice(&0u16.to_le_bytes());         // Extra field len
    central.extend_from_slice(&0u16.to_le_bytes());         // Comment len
    central.extend_from_slice(&0u16.to_le_bytes());         // Disk number
    central.extend_from_slice(&0u16.to_le_bytes());         // Internal attrs
    central.extend_from_slice(&0u32.to_le_bytes());         // External attrs
    central.extend_from_slice(&offset.to_le_bytes());       // Offset of local header
    central.extend_from_slice(name_bytes);

    offset += local.len() as u32;
    local_headers.extend(local);
    central_headers.extend(central);
  }

  // End of Central Directory Record (22 bytes)
  let central_size = central_headers.len() as u32;
  let mut eocd = Vec::with_capacity(22);
  eocd.extend_from_slice(&0x06054b50u32.to_le_bytes()); // EOCD signature
  eocd.extend_from_slice(&0u16.to_le_bytes());          // Disk num
  eocd.extend_from_slice(&0u16.to_le_bytes());          // Start disk
  eocd.extend_from_slice(&2u16.to_le_bytes());          // Entries on disk (2)
  eocd.extend_from_slice(&2u16.to_le_bytes());          // Total entries (2)
  eocd.extend_from_slice(&central_size.to_le_bytes());  // Size of central dir
  eocd.extend_from_slice(&offset.to_le_bytes());        // Offset of central dir
  eocd.extend_from_slice(&0u16.to_le_bytes());          // Comment length

  let mut final_zip = Vec::with_capacity(local_headers.len() + central_headers.len() + eocd.len());
  final_zip.extend(local_headers);
  final_zip.extend(central_headers);
  final_zip.extend(eocd);
  final_zip
}

/// 6. Native Trajectory-Aligned Dynamic Squash & Stretch
#[napi]
pub fn rust_calculate_trajectory_squash(
  trajectory: Vec<NativeTrajectoryKeyframe>,
  squash_intensity: f64,
) -> Vec<NativeDynamicSquashKeyframe> {
  let mut result = Vec::with_capacity(trajectory.len());

  for i in 0..trajectory.len() {
    let curr = &trajectory[i];
    let mut vx = 0.0;
    let mut vy = 0.0;

    if i > 0 {
      vx = curr.pos_x - trajectory[i - 1].pos_x;
      vy = curr.pos_y - trajectory[i - 1].pos_y;
    } else if trajectory.len() > 1 {
      vx = trajectory[1].pos_x - curr.pos_x;
      vy = trajectory[1].pos_y - curr.pos_y;
    }

    let speed = (vx * vx + vy * vy).sqrt();
    let angle_rad = vy.atan2(vx);
    let angle_deg = ((angle_rad * 180.0 / std::f64::consts::PI) * 100.0).round() / 100.0;

    let stretch_factor = 1.0 + (speed * 0.02 * squash_intensity).min(0.6);
    let squash_factor = ((1.0 / stretch_factor) * 1000.0).round() / 1000.0;

    result.push(NativeDynamicSquashKeyframe {
      frame: curr.frame,
      squash_angle_deg: angle_deg,
      scale_x: ((stretch_factor) * 1000.0).round() / 1000.0,
      scale_y: squash_factor,
    });
  }

  result
}

/// 7. Native Vector Point Morph Interpolation
#[napi]
pub fn rust_interpolate_point_morph(
  source_points: Vec<NativeVectorPoint>,
  target_points: Vec<NativeVectorPoint>,
  t: f64,
) -> Vec<NativeVectorPoint> {
  let count = source_points.len().min(target_points.len());
  let mut interpolated = Vec::with_capacity(count);
  let clamped_t = t.clamp(0.0, 1.0);
  // Smooth Hermite S-curve interpolation
  let ease_t = clamped_t * clamped_t * (3.0 - 2.0 * clamped_t);

  for i in 0..count {
    let p_src = &source_points[i];
    let p_dst = &target_points[i];

    let x = p_src.x + (p_dst.x - p_src.x) * ease_t;
    let y = p_src.y + (p_dst.y - p_src.y) * ease_t;

    let handle_in = match (&p_src.handle_in, &p_dst.handle_in) {
      (Some(h1), Some(h2)) => Some(NativeBezierHandle {
        dx: h1.dx + (h2.dx - h1.dx) * ease_t,
        dy: h1.dy + (h2.dy - h1.dy) * ease_t,
      }),
      (Some(h1), None) => Some(h1.clone()),
      (None, Some(h2)) => Some(h2.clone()),
      (None, None) => None,
    };

    let handle_out = match (&p_src.handle_out, &p_dst.handle_out) {
      (Some(h1), Some(h2)) => Some(NativeBezierHandle {
        dx: h1.dx + (h2.dx - h1.dx) * ease_t,
        dy: h1.dy + (h2.dy - h1.dy) * ease_t,
      }),
      (Some(h1), None) => Some(h1.clone()),
      (None, Some(h2)) => Some(h2.clone()),
      (None, None) => None,
    };

    let curvature = match (p_src.curvature, p_dst.curvature) {
      (Some(c1), Some(c2)) => Some(c1 + (c2 - c1) * ease_t),
      (Some(c1), None) => Some(c1),
      (None, Some(c2)) => Some(c2),
      (None, None) => None,
    };

    interpolated.push(NativeVectorPoint {
      x: (x * 1000.0).round() / 1000.0,
      y: (y * 1000.0).round() / 1000.0,
      handle_in,
      handle_out,
      curvature,
    });
  }

  interpolated
}

/// 8. Native Secondary Bone Physics Dynamics Simulation (Spring / Damper Integration)
#[derive(Serialize, Deserialize, Clone, Debug)]
#[napi(object)]
pub struct NativePhysicsConfig {
  pub spring: f64,
  pub damping: f64,
  pub mass: f64,
  pub gravity: f64,
  pub frames: u32,
}

#[napi]
pub fn rust_simulate_bone_physics(
  initial_angle_deg: f64,
  target_angle_deg: f64,
  config: NativePhysicsConfig,
) -> Vec<f64> {
  let mut trajectory = Vec::with_capacity(config.frames as usize);
  let mut current_angle = initial_angle_deg;
  let mut velocity = 0.0;
  let dt = 1.0 / 24.0; // 24 fps standard
  let effective_mass = config.mass.max(0.1);

  for _ in 0..config.frames {
    let displacement = current_angle - target_angle_deg;
    let spring_force = -config.spring * displacement;
    let damping_force = -config.damping * velocity;
    let total_force = spring_force + damping_force + config.gravity;

    let acceleration = total_force / effective_mass;
    velocity += acceleration * dt;
    current_angle += velocity * dt;

    trajectory.push((current_angle * 100.0).round() / 100.0);
  }

  trajectory
}

// ==============================================================================
// 9. Native Smear Frames & Breakdown Generator (Switch-Layer Motion Blur & S-Smears)
// ==============================================================================

#[derive(Serialize, Deserialize, Clone, Debug)]
#[napi(object)]
pub struct NativeSmearDetection {
  pub frame: f64,
  pub smear_type: String, // "arc", "stretch", "multi", "whiplash"
  pub velocity_magnitude: f64,
  pub motion_angle_deg: f64,
  pub recommended_duration_frames: u32,
}

/// Detects high-velocity spikes in animation trajectories to trigger automatic Smear switch keys
#[napi]
pub fn rust_detect_smear_breakdowns(
  keyframes: Vec<NativeTrajectoryKeyframe>,
  velocity_threshold: f64,
  angular_velocity_threshold_deg: f64,
) -> Vec<NativeSmearDetection> {
  let mut detections = Vec::new();
  if keyframes.len() < 2 {
    return detections;
  }

  for i in 1..keyframes.len() {
    let prev = &keyframes[i - 1];
    let curr = &keyframes[i];
    let dt = (curr.frame - prev.frame).abs().max(1.0);

    let dx = curr.pos_x - prev.pos_x;
    let dy = curr.pos_y - prev.pos_y;
    let vel = (dx * dx + dy * dy).sqrt() / dt;
    let angle_rad = dy.atan2(dx);
    let angle_deg = (angle_rad * 180.0 / std::f64::consts::PI).round();

    if vel >= velocity_threshold {
      // Check angular change if we have 3 points (curve/arc vs straight stretch)
      let mut is_arc = false;
      if i + 1 < keyframes.len() {
        let next = &keyframes[i + 1];
        let ndx = next.pos_x - curr.pos_x;
        let ndy = next.pos_y - curr.pos_y;
        let next_angle = (ndy.atan2(ndx) * 180.0 / std::f64::consts::PI).round();
        let angle_diff = (next_angle - angle_deg).abs();
        if angle_diff >= angular_velocity_threshold_deg && angle_diff <= 180.0 {
          is_arc = true;
        }
      }

      let smear_type = if is_arc {
        "arc".to_string()
      } else if vel > velocity_threshold * 2.0 {
        "multi".to_string()
      } else {
        "stretch".to_string()
      };

      detections.push(NativeSmearDetection {
        frame: curr.frame,
        smear_type,
        velocity_magnitude: (vel * 100.0).round() / 100.0,
        motion_angle_deg: angle_deg,
        recommended_duration_frames: if vel > velocity_threshold * 2.5 { 2 } else { 1 },
      });
    }
  }

  detections
}

/// Generates a Motion Arc (Crescent Blade) Smear Vector Shape connecting motion sweep
#[napi]
pub fn rust_generate_arc_smear(
  name: String,
  start_x: f64,
  start_y: f64,
  end_x: f64,
  end_y: f64,
  arc_curvature: f64,
  base_thickness: f64,
  trail_taper: f64,
  fill_rgba: Vec<u32>,
  stroke_width: f64,
) -> NativeVectorShape {
  let dx = end_x - start_x;
  let dy = end_y - start_y;
  let dist = (dx * dx + dy * dy).sqrt().max(0.01);
  let nx = -dy / dist;
  let ny = dx / dist;

  // Midpoint with perpendicular curvature displacement
  let mid_x = (start_x + end_x) * 0.5 + nx * arc_curvature * dist;
  let mid_y = (start_y + end_y) * 0.5 + ny * arc_curvature * dist;

  let t_start = base_thickness * trail_taper;
  let t_mid = base_thickness * 1.35;
  let t_end = base_thickness;

  // Outer Arc Points
  let p0 = NativeVectorPoint {
    x: (start_x - nx * t_start * 0.5 * 1000.0).round() / 1000.0,
    y: (start_y - ny * t_start * 0.5 * 1000.0).round() / 1000.0,
    handle_in: None,
    handle_out: Some(NativeBezierHandle { dx: dx * 0.25, dy: dy * 0.25 }),
    curvature: Some(0.35),
  };
  let p1 = NativeVectorPoint {
    x: (mid_x + nx * t_mid * 0.5 * 1000.0).round() / 1000.0,
    y: (mid_y + ny * t_mid * 0.5 * 1000.0).round() / 1000.0,
    handle_in: Some(NativeBezierHandle { dx: -dx * 0.2, dy: -dy * 0.2 }),
    handle_out: Some(NativeBezierHandle { dx: dx * 0.2, dy: dy * 0.2 }),
    curvature: Some(0.4),
  };
  let p2 = NativeVectorPoint {
    x: (end_x + nx * t_end * 0.5 * 1000.0).round() / 1000.0,
    y: (end_y + ny * t_end * 0.5 * 1000.0).round() / 1000.0,
    handle_in: Some(NativeBezierHandle { dx: -dx * 0.25, dy: -dy * 0.25 }),
    handle_out: None,
    curvature: Some(0.35),
  };

  // Inner Arc Points (Returning back to close the blade)
  let p3 = NativeVectorPoint {
    x: (end_x - nx * t_end * 0.5 * 1000.0).round() / 1000.0,
    y: (end_y - ny * t_end * 0.5 * 1000.0).round() / 1000.0,
    handle_in: None,
    handle_out: Some(NativeBezierHandle { dx: -dx * 0.25, dy: -dy * 0.25 }),
    curvature: Some(0.35),
  };
  let p4 = NativeVectorPoint {
    x: (mid_x - nx * t_mid * 0.3 * 1000.0).round() / 1000.0,
    y: (mid_y - ny * t_mid * 0.3 * 1000.0).round() / 1000.0,
    handle_in: Some(NativeBezierHandle { dx: dx * 0.2, dy: dy * 0.2 }),
    handle_out: Some(NativeBezierHandle { dx: -dx * 0.2, dy: -dy * 0.2 }),
    curvature: Some(0.4),
  };
  let p5 = NativeVectorPoint {
    x: (start_x + nx * t_start * 0.5 * 1000.0).round() / 1000.0,
    y: (start_y + ny * t_start * 0.5 * 1000.0).round() / 1000.0,
    handle_in: Some(NativeBezierHandle { dx: dx * 0.25, dy: dy * 0.25 }),
    handle_out: None,
    curvature: Some(0.35),
  };

  let r = *fill_rgba.get(0).unwrap_or(&240);
  let g = *fill_rgba.get(1).unwrap_or(&215);
  let b = *fill_rgba.get(2).unwrap_or(&195);
  let a = *fill_rgba.get(3).unwrap_or(&255);

  NativeVectorShape {
    name,
    points: vec![p0, p1, p2, p3, p4, p5],
    fill_color: NativeRgba { r, g, b, a },
    stroke_color: NativeRgba { r: 26, g: 26, b: 26, a: 255 },
    stroke_width,
    is_closed: true,
  }
}

/// Generates a Directional Velocity Stretch Smear (Teardrop / Speed Capsule)
#[napi]
pub fn rust_generate_velocity_stretch_smear(
  name: String,
  center_x: f64,
  center_y: f64,
  radius_x: f64,
  radius_y: f64,
  vel_x: f64,
  vel_y: f64,
  stretch_gain: f64,
  fill_rgba: Vec<u32>,
  stroke_width: f64,
) -> NativeVectorShape {
  let speed = (vel_x * vel_x + vel_y * vel_y).sqrt();
  let stretch = 1.0 + (speed * stretch_gain).min(3.5);
  let squash = 1.0 / (stretch.sqrt()); // Volume conservation

  let angle_rad = vel_y.atan2(vel_x);
  let cos_a = angle_rad.cos();
  let sin_a = angle_rad.sin();

  let rx = radius_x * stretch;
  let ry = radius_y * squash;
  let cx = center_x;
  let cy = center_y;
  let kappa = 0.552284749831;

  // Local ellipse points oriented along velocity axis
  let local_points = vec![
    (0.0, ry, -rx * kappa, 0.0, rx * kappa, 0.0),
    (rx * 0.7, ry * 0.7, -rx * 0.3, ry * 0.3, rx * 0.3, -ry * 0.3),
    (rx, 0.0, 0.0, ry * kappa, 0.0, -ry * kappa),
    (rx * 0.7, -ry * 0.7, rx * 0.3, ry * 0.3, -rx * 0.3, -ry * 0.3),
    (0.0, -ry, rx * kappa, 0.0, -rx * kappa, 0.0),
    // Trailing speed tail tip
    (-rx * 1.35, 0.0, 0.0, -ry * 0.2, 0.0, ry * 0.2),
  ];

  let mut points = Vec::with_capacity(local_points.len());
  for (lx, ly, hin_x, hin_y, hout_x, hout_y) in local_points {
    let wx = cx + lx * cos_a - ly * sin_a;
    let wy = cy + lx * sin_a + ly * cos_a;

    let h_in_wx = hin_x * cos_a - hin_y * sin_a;
    let h_in_wy = hin_x * sin_a + hin_y * cos_a;
    let h_out_wx = hout_x * cos_a - hout_y * sin_a;
    let h_out_wy = hout_x * sin_a + hout_y * cos_a;

    points.push(NativeVectorPoint {
      x: (wx * 1000.0).round() / 1000.0,
      y: (wy * 1000.0).round() / 1000.0,
      handle_in: Some(NativeBezierHandle {
        dx: (h_in_wx * 1000.0).round() / 1000.0,
        dy: (h_in_wy * 1000.0).round() / 1000.0,
      }),
      handle_out: Some(NativeBezierHandle {
        dx: (h_out_wx * 1000.0).round() / 1000.0,
        dy: (h_out_wy * 1000.0).round() / 1000.0,
      }),
      curvature: Some(0.35),
    });
  }

  let r = *fill_rgba.get(0).unwrap_or(&240);
  let g = *fill_rgba.get(1).unwrap_or(&215);
  let b = *fill_rgba.get(2).unwrap_or(&195);
  let a = *fill_rgba.get(3).unwrap_or(&255);

  NativeVectorShape {
    name,
    points,
    fill_color: NativeRgba { r, g, b, a },
    stroke_color: NativeRgba { r: 26, g: 26, b: 26, a: 255 },
    stroke_width,
    is_closed: true,
  }
}

/// Generates an S-Curve Whiplash Breakdown Shape for flexible snapping appendages
#[napi]
pub fn rust_generate_whiplash_s_smear(
  name: String,
  pivot_x: f64,
  pivot_y: f64,
  tip_x: f64,
  tip_y: f64,
  s_intensity: f64,
  thickness: f64,
  fill_rgba: Vec<u32>,
  stroke_width: f64,
) -> NativeVectorShape {
  let dx = tip_x - pivot_x;
  let dy = tip_y - pivot_y;
  let dist = (dx * dx + dy * dy).sqrt().max(0.01);
  let nx = -dy / dist;
  let ny = dx / dist;

  // 4 control points forming an S-wave contour
  let p1_x = pivot_x + dx * 0.33 + nx * s_intensity * dist;
  let p1_y = pivot_y + dy * 0.33 + ny * s_intensity * dist;

  let p2_x = pivot_x + dx * 0.66 - nx * s_intensity * dist;
  let p2_y = pivot_y + dy * 0.66 - ny * s_intensity * dist;

  let hw = thickness * 0.5;

  let points = vec![
    NativeVectorPoint {
      x: (pivot_x + nx * hw * 1000.0).round() / 1000.0,
      y: (pivot_y + ny * hw * 1000.0).round() / 1000.0,
      handle_in: None,
      handle_out: Some(NativeBezierHandle { dx: dx * 0.15, dy: dy * 0.15 }),
      curvature: Some(0.35),
    },
    NativeVectorPoint {
      x: (p1_x + nx * hw * 1000.0).round() / 1000.0,
      y: (p1_y + ny * hw * 1000.0).round() / 1000.0,
      handle_in: Some(NativeBezierHandle { dx: -dx * 0.1, dy: -dy * 0.1 }),
      handle_out: Some(NativeBezierHandle { dx: dx * 0.1, dy: dy * 0.1 }),
      curvature: Some(0.4),
    },
    NativeVectorPoint {
      x: (p2_x + nx * hw * 1000.0).round() / 1000.0,
      y: (p2_y + ny * hw * 1000.0).round() / 1000.0,
      handle_in: Some(NativeBezierHandle { dx: -dx * 0.1, dy: -dy * 0.1 }),
      handle_out: Some(NativeBezierHandle { dx: dx * 0.1, dy: dy * 0.1 }),
      curvature: Some(0.4),
    },
    NativeVectorPoint {
      x: (tip_x * 1000.0).round() / 1000.0,
      y: (tip_y * 1000.0).round() / 1000.0,
      handle_in: Some(NativeBezierHandle { dx: -dx * 0.15, dy: -dy * 0.15 }),
      handle_out: None,
      curvature: Some(0.35),
    },
    NativeVectorPoint {
      x: (p2_x - nx * hw * 1000.0).round() / 1000.0,
      y: (p2_y - ny * hw * 1000.0).round() / 1000.0,
      handle_in: Some(NativeBezierHandle { dx: dx * 0.1, dy: dy * 0.1 }),
      handle_out: Some(NativeBezierHandle { dx: -dx * 0.1, dy: -dy * 0.1 }),
      curvature: Some(0.4),
    },
    NativeVectorPoint {
      x: (p1_x - nx * hw * 1000.0).round() / 1000.0,
      y: (p1_y - ny * hw * 1000.0).round() / 1000.0,
      handle_in: Some(NativeBezierHandle { dx: dx * 0.1, dy: dy * 0.1 }),
      handle_out: Some(NativeBezierHandle { dx: -dx * 0.1, dy: -dy * 0.1 }),
      curvature: Some(0.4),
    },
    NativeVectorPoint {
      x: (pivot_x - nx * hw * 1000.0).round() / 1000.0,
      y: (pivot_y - ny * hw * 1000.0).round() / 1000.0,
      handle_in: Some(NativeBezierHandle { dx: -dx * 0.15, dy: -dy * 0.15 }),
      handle_out: None,
      curvature: Some(0.35),
    },
  ];

  let r = *fill_rgba.get(0).unwrap_or(&240);
  let g = *fill_rgba.get(1).unwrap_or(&215);
  let b = *fill_rgba.get(2).unwrap_or(&195);
  let a = *fill_rgba.get(3).unwrap_or(&255);

  NativeVectorShape {
    name,
    points,
    fill_color: NativeRgba { r, g, b, a },
    stroke_color: NativeRgba { r: 26, g: 26, b: 26, a: 255 },
    stroke_width,
    is_closed: true,
  }
}


