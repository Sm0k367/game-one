import * as THREE from 'three/webgpu';
import { pass, bloom, tslFn, uv, vec2, vec3, vec4, color, fract, time, mix, step, hash, floor, positionLocal } from 'three/tsl';

let renderer, scene, camera, postProcessing, ship;
const pointer = new THREE.Vector2();

async function init() {
    renderer = new THREE.WebGPURenderer({ antialias: true });
    await renderer.init();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.AgXToneMapping; // Modern filmic look
    renderer.toneMappingExposure = 1.0;
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = color(0x000104);
    scene.fog = new THREE.Fog(0x000104, 10, 100);

    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, 4, 20);

    // POST-PROCESSING: THE BLOOM SECRET
    postProcessing = new THREE.PostProcessing(renderer);
    const scenePass = pass(scene, camera);
    const bloomPass = bloom(scenePass, 1.2, 0.1, 0.9); // High threshold = Sharp glow
    postProcessing.outputNode = scenePass.add(bloomPass);

    // 1. NEON GRID
    const gridMat = new THREE.MeshBasicNodeMaterial();
    gridMat.colorNode = tslFn(() => {
        const coords = uv().mul(60).add(vec2(0, time.mul(-1.5)));
        const lines = step(0.97, fract(coords.x)).add(step(0.97, fract(coords.y)));
        return vec4(vec3(0.0, 0.8, 1.0).mul(lines).mul(3.0), 1.0);
    })();
    const grid = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), gridMat);
    grid.rotation.x = -Math.PI / 2;
    scene.add(grid);

    // 2. DETAILED BUILDINGS
    const buildGeo = new THREE.BoxGeometry(1, 1, 1);
    const buildMat = new THREE.MeshStandardNodeMaterial({ color: 0x010102 });
    buildMat.emissiveNode = tslFn(() => {
        const p = positionLocal.xy.mul(vec2(8, 15));
        const grid = step(0.85, fract(p));
        const id = hash(floor(p));
        const neon = mix(vec3(0, 1, 1.5), vec3(1.5, 0, 1), id.step(0.8));
        return neon.mul(grid).mul(2.0);
    })();

    const mesh = new THREE.InstancedMesh(buildGeo, buildMat, 600);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 600; i++) {
        const x = (Math.random() - 0.5) * 150;
        const z = (Math.random() - 0.5) * 300;
        if (Math.abs(x) < 15) continue;
        dummy.position.set(x, 0, z);
        dummy.scale.set(6, Math.random() * 80 + 10, 6);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(mesh);

    // 3. HORIZON SUN
    const sun = new THREE.Mesh(
        new THREE.SphereGeometry(25, 32, 32),
        new THREE.MeshBasicNodeMaterial({ color: 0xffffff })
    );
    sun.material.colorNode = vec3(5, 5, 8); // HDR Bright
    sun.position.set(0, -5, -150);
    scene.add(sun);

    // 4. PLAYER SHIP
    ship = new THREE.Mesh(
        new THREE.ConeGeometry(0.5, 2, 3),
        new THREE.MeshStandardNodeMaterial({ color: 0x050505 })
    );
    ship.rotation.x = Math.PI / 2;
    scene.add(ship);

    window.addEventListener('pointermove', (e) => {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    animate();
}

function animate() {
    requestAnimationFrame(animate);
    const t = performance.now() * 0.001;

    if (ship) {
        ship.position.x = THREE.MathUtils.lerp(ship.position.x, pointer.x * 20, 0.1);
        ship.position.y = THREE.MathUtils.lerp(ship.position.y, (pointer.y * 10) + 4, 0.1);
        ship.rotation.z = (ship.position.x - (pointer.x * 20)) * 0.2;
    }

    postProcessing.render();
}

init();
