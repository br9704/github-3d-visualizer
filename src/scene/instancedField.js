import * as THREE from 'three'

/**
 * instancedField — one draw call for the whole universe.
 *
 * Before this, every repository got its own `THREE.Mesh` AND its own cloned
 * `MeshPhongMaterial`: 100 repositories meant 100 draw calls and 100 material
 * compilations. MOTION.md is explicit — "never 100 draw calls for 100 spheres".
 *
 * Two design notes worth keeping:
 *
 * 1. The material is OPAQUE. Fading is done by lerping each instance's colour
 *    toward the page ground (--bg #050505) rather than by lowering alpha.
 *    On a warm-black background the two are visually equivalent, and the
 *    opaque path avoids transparency sorting entirely — which also removes the
 *    depth artefacts the per-mesh transparent version produced where spheres
 *    overlapped.
 *
 * 2. Per-instance opacity is not supported by stock materials anyway; it would
 *    need a custom shader. Colour lerp gets the same result with no shader to
 *    maintain.
 */

const BG = new THREE.Color(0x050505)

export class InstancedField {
  /**
   * @param {number} count
   * @param {number} detail - icosahedron subdivision level
   */
  constructor(count, detail) {
    this.count = count
    this.geometry = new THREE.IcosahedronGeometry(1, detail)
    this.material = new THREE.MeshPhongMaterial({
      color: 0xffffff, // white, so per-instance colour is the whole colour
      shininess: 60,
      specular: 0x222222
    })

    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, count)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.mesh.frustumCulled = false // one object; culling it culls everything

    this.dummy = new THREE.Object3D()
    this.tmpColor = new THREE.Color()

    // Base colours, kept so fading can lerp from the true colour every frame
    // rather than compounding round-trips through the instance buffer.
    this.baseColors = new Array(count).fill(null).map(() => new THREE.Color())
  }

  /** @param {number} i @param {number} hex */
  setBaseColor(i, hex) {
    this.baseColors[i].setHex(hex)
  }

  /**
   * @param {number} i
   * @param {{x:number,y:number,z:number}} position
   * @param {number} scale
   */
  setTransform(i, position, scale) {
    this.dummy.position.set(position.x, position.y, position.z)
    this.dummy.scale.setScalar(scale)
    this.dummy.updateMatrix()
    this.mesh.setMatrixAt(i, this.dummy.matrix)
  }

  /**
   * @param {number} i
   * @param {number} fade - 0 = fully faded into the background, 1 = full colour
   * @param {number} [lift] - extra brightness, for hover
   */
  setFade(i, fade, lift = 0) {
    this.tmpColor.copy(BG).lerp(this.baseColors[i], Math.max(0, Math.min(1, fade)))
    if (lift > 0) this.tmpColor.lerp(new THREE.Color(0xffffff), lift * 0.35)
    this.mesh.setColorAt(i, this.tmpColor)
  }

  commit() {
    this.mesh.instanceMatrix.needsUpdate = true
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
    this.mesh.dispose()
  }
}

/**
 * The hover ring — a 1px outline around the hovered sphere, billboarded so it
 * always reads as a ring rather than an ellipse.
 *
 * MOTION.md: green ONLY when the repository was pushed within 30 days. One
 * colour, one meaning: alive.
 */
export class HoverRing {
  constructor() {
    this.geometry = new THREE.RingGeometry(1.24, 1.28, 48)
    this.material = new THREE.MeshBasicMaterial({
      color: 0xf0ece4,
      transparent: true,
      opacity: 0,
      depthTest: false,
      side: THREE.DoubleSide
    })
    this.mesh = new THREE.Mesh(this.geometry, this.material)
    this.mesh.renderOrder = 10
    this.mesh.visible = false
  }

  /**
   * @param {THREE.Vector3} position
   * @param {number} radius
   * @param {THREE.Camera} camera
   * @param {boolean} alive - pushed within the last 30 days
   */
  show(position, radius, camera, alive) {
    this.mesh.visible = true
    this.mesh.position.copy(position)
    this.mesh.scale.setScalar(radius)
    this.mesh.quaternion.copy(camera.quaternion) // billboard
    this.material.color.setHex(alive ? 0x3fb950 : 0xf0ece4)
  }

  hide() {
    this.mesh.visible = false
    this.material.opacity = 0
  }

  /** @param {number} dt */
  fade(dt, target) {
    this.material.opacity += (target - this.material.opacity) * Math.min(1, dt * 14)
    if (this.material.opacity < 0.01 && target === 0) this.mesh.visible = false
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
  }
}

/** True when the repository was pushed within the last 30 days. */
export function isAlive(repo, now = Date.now()) {
  const t = Date.parse(repo?.pushed_at || repo?.updated_at || '')
  if (Number.isNaN(t)) return false
  return now - t < 30 * 24 * 60 * 60 * 1000
}

/**
 * WireField — a hairline wireframe shell over each node.
 *
 * This is what turns a shaded ball into an instrument readout: you can see the
 * facet structure, which reads as constructed rather than photographic. Ryoji
 * Ikeda by way of a wireframe, which is the reference the design system names.
 *
 * One extra draw call for the whole scene, whatever the repository count.
 */
export class WireField {
  constructor(count, detail) {
    this.geometry = new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1, detail))
    this.material = new THREE.LineBasicMaterial({
      color: 0xf0ece4,
      transparent: true,
      opacity: 0.16,
      depthWrite: false
    })
    // InstancedMesh does not take line geometry, so this is a single
    // LineSegments per node would be N draw calls. Instead the shell is drawn
    // as one merged geometry rebuilt whenever the scene changes — still one
    // draw call, and the scene only changes on a new search.
    this.segments = new THREE.LineSegments(new THREE.BufferGeometry(), this.material)
    this.segments.frustumCulled = false
    this.base = this.geometry
    this.count = count
  }

  /**
   * Rebuild the merged wireframe for the current node transforms.
   * @param {Array<{position: THREE.Vector3, size: number}>} nodes
   */
  rebuild(nodes) {
    const src = this.base.attributes.position
    const perNode = src.count
    const out = new Float32Array(perNode * nodes.length * 3)

    let o = 0
    for (const n of nodes) {
      const s = n.size
      for (let i = 0; i < perNode; i++) {
        out[o++] = src.getX(i) * s + n.position.x
        out[o++] = src.getY(i) * s + n.position.y
        out[o++] = src.getZ(i) * s + n.position.z
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(out, 3))
    this.segments.geometry.dispose()
    this.segments.geometry = geo
  }

  setOpacity(v) {
    this.material.opacity = v
  }

  dispose() {
    this.base.dispose()
    this.material.dispose()
    this.segments.geometry.dispose()
  }
}

/**
 * LabelField — a billboarded monospace language code on every node.
 *
 * The user asked for icons. The design system forbids pictographic emoji and
 * asks for "monospace for data, labels, readouts", so the icon here is a two
 * or three character language code: JS, PY, RS, C++.
 *
 * Implementation notes:
 *   - all codes are baked into ONE canvas atlas, so the whole set of labels is
 *     a single draw call regardless of repository count
 *   - the quad is billboarded in the VERTEX shader (built in view space), so
 *     labels stay flat to the camera without any per-frame CPU work
 *   - labels fade out below a pixel size where they would be unreadable mush
 */
export class LabelField {
  /**
   * @param {string[]} codes - every distinct code that can appear
   * @param {number} count
   */
  constructor(codes, count) {
    const CELL = 128
    const cols = Math.ceil(Math.sqrt(codes.length))
    const rows = Math.ceil(codes.length / cols)

    const canvas = document.createElement('canvas')
    canvas.width = cols * CELL
    canvas.height = rows * CELL
    const g = canvas.getContext('2d')
    g.clearRect(0, 0, canvas.width, canvas.height)
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillStyle = '#ffffff'

    this.index = new Map()
    codes.forEach((code, i) => {
      const cx = (i % cols) * CELL
      const cy = Math.floor(i / cols) * CELL
      // Shrink the type for longer codes so C++ and PHP still fit the cell.
      const size = code.length >= 3 ? 46 : code.length === 2 ? 62 : 72
      g.font = `700 ${size}px "JetBrains Mono Variable", ui-monospace, monospace`
      // Dark outline first: a yellow JavaScript node is bright enough that
      // plain warm-white type on it is unreadable.
      g.lineWidth = Math.max(4, size * 0.16)
      g.lineJoin = 'round'
      g.strokeStyle = 'rgba(5, 5, 5, 0.85)'
      g.strokeText(code, cx + CELL / 2, cy + CELL / 2 + 2)
      g.fillStyle = '#ffffff'
      g.fillText(code, cx + CELL / 2, cy + CELL / 2 + 2)
      this.index.set(code, i)
    })

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.generateMipmaps = true
    this.texture = texture

    this.cols = cols
    this.rows = rows
    this.count = count

    const geometry = new THREE.InstancedBufferGeometry()
    const quad = new THREE.PlaneGeometry(1, 1)
    geometry.setIndex(quad.index)
    geometry.setAttribute('position', quad.attributes.position)
    geometry.setAttribute('uv', quad.attributes.uv)

    this.offsets = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3)
    this.cells = new THREE.InstancedBufferAttribute(new Float32Array(count * 2), 2)
    this.scales = new THREE.InstancedBufferAttribute(new Float32Array(count), 1)
    this.alphas = new THREE.InstancedBufferAttribute(new Float32Array(count), 1)
    this.radii = new THREE.InstancedBufferAttribute(new Float32Array(count), 1)

    geometry.setAttribute('aOffset', this.offsets)
    geometry.setAttribute('aCell', this.cells)
    geometry.setAttribute('aScale', this.scales)
    geometry.setAttribute('aAlpha', this.alphas)
    geometry.setAttribute('aRadius', this.radii)
    geometry.instanceCount = count

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uAtlas: { value: texture },
        uCell: { value: new THREE.Vector2(1 / cols, 1 / rows) },
        uColor: { value: new THREE.Color(0xf0ece4) }
      },
      vertexShader: /* glsl */ `
        attribute vec3 aOffset;
        attribute vec2 aCell;
        attribute float aScale;
        attribute float aAlpha;
        attribute float aRadius;
        varying vec2 vUv;
        varying float vAlpha;
        uniform vec2 uCell;

        void main() {
          vUv = uv * uCell + aCell * uCell;
          vAlpha = aAlpha;

          // Billboard: build the quad in VIEW space so it always faces the
          // camera, with no per-frame CPU work.
          vec4 centre = modelViewMatrix * vec4(aOffset, 1.0);
          // Push the label IN FRONT of its node. Sitting at the node centre
          // put it inside the sphere, where the sphere's own front face
          // depth-tested it away — which is why the labels were invisible.
          centre.z += aRadius * 1.08;
          centre.xy += position.xy * aScale;
          gl_Position = projectionMatrix * centre;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uAtlas;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying float vAlpha;

        void main() {
          float a = texture2D(uAtlas, vUv).a * vAlpha;
          if (a < 0.02) discard;
          gl_FragColor = vec4(uColor, a);
        }
      `
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 5
  }

  /**
   * @param {number} i
   * @param {THREE.Vector3} position
   * @param {string} code
   * @param {number} scale - world-space half-extent of the label quad
   * @param {number} alpha
   */
  set(i, position, code, scale, alpha, radius = scale) {
    this.offsets.setXYZ(i, position.x, position.y, position.z)
    const idx = this.index.get(code) ?? 0
    this.cells.setXY(i, idx % this.cols, this.rows - 1 - Math.floor(idx / this.cols))
    this.scales.setX(i, scale)
    this.alphas.setX(i, alpha)
    this.radii.setX(i, radius)
  }

  commit() {
    this.offsets.needsUpdate = true
    this.cells.needsUpdate = true
    this.scales.needsUpdate = true
    this.alphas.needsUpdate = true
    this.radii.needsUpdate = true
  }

  dispose() {
    this.mesh.geometry.dispose()
    this.material.dispose()
    this.texture.dispose()
  }
}
