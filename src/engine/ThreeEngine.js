import * as THREE from 'three';

export class ThreeEngine {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    
    // Core components
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, this.aspectRatio, 0.1, 1000);
    
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: "high-performance",
      alpha: false
    });
    
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.clock = new THREE.Clock();
    
    // 1. Ambient & Hemisphere Lighting (Vibrant All-around illumination)
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e1b4b, 0.9);
    this.scene.add(this.hemiLight);

    // 2. Directional Sun Light
    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    this.dirLight.position.set(15, 35, 15);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 200;
    this.dirLight.shadow.camera.left = -30;
    this.dirLight.shadow.camera.right = 30;
    this.dirLight.shadow.camera.top = 30;
    this.dirLight.shadow.camera.bottom = -30;
    this.scene.add(this.dirLight);

    // Light subtle fog for depth
    this.scene.fog = new THREE.FogExp2(0x1e1b4b, 0.005);

    // Dynamic light target group
    this.gameGroup = new THREE.Group();
    this.scene.add(this.gameGroup);

    // Resize Observer to guarantee crisp rendering
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    if (this.canvas.parentElement) {
      this.resizeObserver.observe(this.canvas.parentElement);
    }
    
    this.onResize();
    window.addEventListener('resize', () => this.onResize());
  }

  get aspectRatio() {
    const width = this.canvas.clientWidth || window.innerWidth || 800;
    const height = this.canvas.clientHeight || window.innerHeight || 600;
    return width / height;
  }

  onResize() {
    const parent = this.canvas.parentElement;
    let width = parent ? parent.clientWidth : this.canvas.clientWidth;
    let height = parent ? parent.clientHeight : this.canvas.clientHeight;
    
    // Fallback if container size is 0
    if (!width || width === 0) width = window.innerWidth - 440;
    if (!height || height === 0) height = window.innerHeight;

    width = Math.max(300, width);
    height = Math.max(300, height);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  applyTheme(theme) {
    if (!theme) return;
    const bgColor = new THREE.Color(theme.bg);
    this.scene.background = bgColor;
    this.scene.fog.color = bgColor;
    this.ambientLight.color = new THREE.Color(0xffffff);
    this.hemiLight.color = new THREE.Color(theme.light);
    this.dirLight.color = new THREE.Color(theme.light);
  }

  clearGameGroup() {
    while (this.gameGroup.children.length > 0) {
      const obj = this.gameGroup.children[0];
      this.gameGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    }
  }

  render() {
    this.onResize(); // Guarantee non-zero canvas sizing on every frame
    this.renderer.render(this.scene, this.camera);
  }
}
