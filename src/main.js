import * as THREE from 'three/webgpu';
import { bloom, pass, toneMapping, tslFn, uv, vec2, vec3, vec4, color, mix, step, fract, sin, time } from 'three/tsl';

let renderer, scene, camera, postProcessing;
let ship, grid, speedLines;

async function init() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 10, 50);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 2, 5);

    renderer = new THREE.WebGPURenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 1. NEON GRID FLOOR (Procedural TSL)
    const gridMaterial = new THREE.MeshBasicNodeMaterial();
    gridMaterial.colorNode = tslFn(() => {
        const coords = uv().mul(40).add(vec2(0, time.mul(-2))); // Moving grid
        const gridLines = step(0.98, fract(coords.x)).add(step(0.98, fract(coords.y)));
        const neonColor = color(0x00ffff).mul(gridLines).mul(5.0); // High intensity for bloom
        return vec4(neonColor, 1.0);
    })();
    
    grid = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), gridMaterial);
    grid.rotation.x = -Math.PI / 2;
    scene.add(grid);

    // 2. THE SHIP (Cyberpunk Wedge)
    const shipGeo = new THREE.ConeGeometry(0.5, 1.5, 3);
    const shipMat = new THREE.MeshStandardNodeMaterial({ color: 0x111111, roughness: 0.1, metalness: 1 });
    ship = new THREE.Mesh(shipGeo, shipMat);
    ship.rotation.x = Math.PI / 2;
    ship.position.y = 1;
    scene.add(ship);

    // 3. ENGINES (Glow)
    const engineMat = new THREE.MeshBasicNodeMaterial({ color: 0xff00ff });
    engineMat.colorNode = color(0xff00ff).mul(10.0); // Super bright
    const engine = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), engineMat);
    engine.position.z = 0.8;
    ship.add(engine);

    // 4. POST PROCESSING (The Secret Sauce)
    postProcessing = new THREE.PostProcessing(renderer);
    const scenePass = pass(scene, camera);
    const bloomPass = bloom(scenePass, 1.5, 0.4, 0.1); // Strength, Radius, Threshold
    
    // Combine and add AgX Tone Mapping
    postProcessing.outputNode = toneMapping(THREE.AgXToneMapping, 1.0, bloomPass);

    window.addEventListener('resize', onWindowResize);
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    const t = performance.now() * 0.001;
    ship.position.x = Math.sin(t) * 2;
    ship.rotation.z = -Math.sin(t) * 0.5;
    
    camera.position.x = ship.position.x * 0.5;
    camera.lookAt(ship.position);

    document.getElementById('speed').innerText = Math.floor(200 + Math.random() * 20);
    
    postProcessing.render();
}

init();
