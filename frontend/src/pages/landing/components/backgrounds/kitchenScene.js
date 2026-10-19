import * as THREE from "three";

// Geometry only: no textures, model downloads, shadows, or post-processing.
export function createKitchenScene(host) {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-5, 5, 4, -4, 0.1, 60);
  camera.position.set(8, 6.5, 9);
  camera.lookAt(0, 1.2, 0);
  scene.add(new THREE.HemisphereLight(0xfff8e8, 0x7a8777, 2.5));
  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(-3, 8, 5);
  scene.add(light);
  const kitchen = new THREE.Group();
  scene.add(kitchen);
  const geometries = new Set();
  const materials = new Set();
  const material = (color, extra = {}) => {
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8,
      ...extra,
    });
    materials.add(mat);
    return mat;
  };
  const cream = material("#e9e3d1"),
    navy = material("#293e49"),
    metal = material("#aabbb4", { metalness: 0.25 }),
    orange = material("#db8948"),
    dark = material("#203039"),
    herb = material("#7b9164"),
    white = material("#fff9e9");
  const cube = new THREE.BoxGeometry(1, 1, 1);
  geometries.add(cube);
  function mesh(geometry, mat, x, y, z, parent = kitchen) {
    geometries.add(geometry);
    const item = new THREE.Mesh(geometry, mat);
    item.position.set(x, y, z);
    parent.add(item);
    return item;
  }
  function box(x, y, z, w, h, d, mat, parent) {
    const item = mesh(cube, mat, x, y, z, parent);
    item.scale.set(w, h, d);
    return item;
  }
  function cylinder(x, y, z, top, bottom, h, mat, parent) {
    return mesh(
      new THREE.CylinderGeometry(top, bottom, h, 16),
      mat,
      x,
      y,
      z,
      parent,
    );
  }
  function ring(x, y, z, r, tube, mat, parent) {
    const item = mesh(
      new THREE.TorusGeometry(r, tube, 6, 20),
      mat,
      x,
      y,
      z,
      parent,
    );
    item.rotation.x = -Math.PI / 2;
    return item;
  }
  // A small open kitchen: tiled backsplash, hood, range, sink and pass.
  box(0, -0.05, 0, 7.5, 0.16, 4.1, cream);
  box(0, 1.65, -1.65, 7.3, 3.3, 0.14, cream);
  const grid = [];
  for (let x = -3.5; x < 3.6; x += 0.5)
    grid.push(x, 0, -1.568, x, 3.28, -1.568);
  for (let y = 0.3; y < 3.3; y += 0.5)
    grid.push(-3.6, y, -1.568, 3.6, y, -1.568);
  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(grid, 3),
  );
  geometries.add(gridGeometry);
  const gridMaterial = new THREE.LineBasicMaterial({
    color: "#c9cbb9",
    transparent: true,
    opacity: 0.55,
  });
  materials.add(gridMaterial);
  kitchen.add(new THREE.LineSegments(gridGeometry, gridMaterial));
  box(-0.35, 0.7, -0.2, 5.7, 1.25, 1.65, navy);
  box(-0.35, 1.38, -0.2, 5.9, 0.15, 1.85, metal);
  box(-1.65, 0.62, 0.64, 1.85, 0.73, 0.05, dark);
  box(-1.65, 0.7, 0.68, 1.45, 0.48, 0.04, metal);
  box(-1.65, 1.05, 0.72, 1.3, 0.06, 0.07, cream);
  for (const x of [-2.2, -1.65, -1.1])
    cylinder(x, 1.24, 0.69, 0.065, 0.065, 0.07, orange).rotation.x =
      Math.PI / 2;
  for (const x of [0, 1.35]) {
    box(x, 0.7, 0.65, 1.18, 1.05, 0.045, metal);
    box(x + 0.42, 1, 0.7, 0.06, 0.25, 0.06, navy);
  }
  for (const x of [-2.25, -1.15])
    for (const z of [-0.7, 0.25]) {
      cylinder(x, 1.48, z, 0.35, 0.35, 0.025, dark);
      ring(x, 1.5, z, 0.23, 0.025, orange);
    }
  box(-1.7, 3.13, -0.48, 2.7, 0.24, 1.7, metal);
  box(-1.7, 3.4, -0.75, 1.35, 0.35, 0.75, cream);
  box(-1.7, 3, 0.22, 2.05, 0.035, 0.1, orange);
  // Orange stockpot with a lid that lifts as the visitor moves the pointer.
  const pot = new THREE.Group();
  pot.position.set(-2.25, 1.53, 0.25);
  kitchen.add(pot);
  cylinder(0, 0.22, 0, 0.38, 0.32, 0.44, orange, pot);
  box(-0.44, 0.3, 0, 0.17, 0.08, 0.1, dark, pot);
  box(0.44, 0.3, 0, 0.17, 0.08, 0.1, dark, pot);
  const lid = new THREE.Group();
  pot.add(lid);
  cylinder(0, 0, 0, 0.4, 0.4, 0.05, cream, lid);
  cylinder(0, 0.06, 0, 0.07, 0.07, 0.08, dark, lid);
  lid.position.y = 0.46;
  cylinder(-1.15, 1.61, -0.7, 0.31, 0.27, 0.14, dark);
  box(-0.7, 1.65, -0.7, 0.65, 0.06, 0.1, dark);
  // Sink and angular tap.
  box(1.28, 1.47, -0.3, 1.2, 0.05, 0.95, dark);
  box(1.28, 1.5, -0.3, 1.02, 0.03, 0.77, metal);
  box(1.28, 1.8, -0.87, 0.07, 0.65, 0.07, cream);
  box(1.28, 2.1, -0.68, 0.07, 0.07, 0.45, cream);
  box(1.28, 2.02, -0.47, 0.07, 0.16, 0.07, cream);
  // Open shelf, plates, pantry jars, and a small herb pot.
  box(1.35, 2.62, -1.27, 2.7, 0.09, 0.6, navy);
  for (let i = 0; i < 4; i++)
    cylinder(0.55, 2.69 + i * 0.045, -1.23, 0.26, 0.26, 0.025, white);
  for (const x of [1.25, 1.7]) {
    cylinder(x, 2.85, -1.26, 0.13, 0.13, 0.38, x === 1.25 ? orange : metal);
    cylinder(x, 3.05, -1.26, 0.14, 0.14, 0.045, dark);
  }
  cylinder(2.35, 2.79, -1.27, 0.18, 0.14, 0.26, orange);
  for (let i = 0; i < 3; i++) {
    const leaf = mesh(
      new THREE.SphereGeometry(0.17, 8, 6),
      herb,
      2.35 + (i - 1) * 0.12,
      3.04,
      -1.27,
    );
    leaf.scale.set(0.7, 1.8, 0.7);
    leaf.rotation.z = (i - 1) * 0.5;
  }
  // Tall refrigerator and order tickets on the pass.
  box(3.07, 1.18, -0.45, 1, 2.3, 1.5, metal);
  box(3.07, 1.2, 0.32, 0.88, 2.15, 0.04, cream);
  box(2.76, 1.5, 0.38, 0.05, 0.55, 0.06, navy);
  box(0.1, 2.04, -1.45, 1.1, 0.045, 0.09, navy);
  for (const x of [-0.25, 0.12, 0.49]) {
    box(x, 1.87, -1.37, 0.26, 0.36, 0.025, white);
    box(x, 1.95, -1.35, 0.16, 0.025, 0.01, orange);
  }

  let visible = false,
    disposed = false,
    frame = 0,
    lastTime = 0;
  let targetX = 0,
    targetY = 0,
    targetLift = 0,
    x = 0,
    y = 0,
    lift = 0;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  function requestRender() {
    if (!frame && visible && !disposed && !document.hidden)
      frame = requestAnimationFrame(render);
  }
  function render(time) {
    frame = 0;
    if (!visible || disposed || document.hidden) return;
    const dt = Math.min((time - lastTime) / 1000 || 0.033, 0.05);
    lastTime = time;
    const ease = reduced.matches ? 1 : 1 - Math.exp(-dt * 8);
    x += (targetX - x) * ease;
    y += (targetY - y) * ease;
    lift += (targetLift - lift) * ease;
    kitchen.rotation.y = x * 0.16;
    kitchen.rotation.x = y * 0.06;
    lid.position.y = 0.46 + lift * 0.28;
    lid.rotation.z = lift * 0.12;
    renderer.render(scene, camera);
    if (
      Math.abs(x - targetX) +
        Math.abs(y - targetY) +
        Math.abs(lift - targetLift) >
      0.001
    )
      requestRender();
  }
  function resize() {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    const halfWidth = Math.max(5.1, 3.7 * aspect);
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfWidth / aspect;
    camera.bottom = -halfWidth / aspect;
    camera.updateProjectionMatrix();
    requestRender();
  }
  function pointer(e) {
    if (reduced.matches || e.pointerType === "touch") return;
    const rect = host.getBoundingClientRect();
    targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    targetLift = 1;
    requestRender();
  }
  function reset() {
    targetX = 0;
    targetY = 0;
    targetLift = 0;
    requestRender();
  }
  function visibility() {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else requestRender();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  host.addEventListener("pointermove", pointer, { passive: true });
  host.addEventListener("pointerleave", reset);
  reduced.addEventListener("change", reset);
  document.addEventListener("visibilitychange", visibility);
  resize();
  return {
    setVisible(value) {
      visible = value;
      if (value) requestRender();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      host.removeEventListener("pointermove", pointer);
      host.removeEventListener("pointerleave", reset);
      reduced.removeEventListener("change", reset);
      document.removeEventListener("visibilitychange", visibility);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
