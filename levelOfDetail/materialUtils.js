import * as THREE from 'three'

export class ElevationShaderMaterial extends THREE.ShaderMaterial {
    constructor(options = {}) {
        const side = options.side
        const wireframe = options.wireframe
        const transparent = options.transparent

        const uniforms = {
            min: { value: options.min || 0 },
            max: { value: options.max || 1 },
            color: new THREE.Uniform(
                new THREE.Color(options.color || 0xffffff)
            ),
        }

        const vertexShader = `
            precision highp float;
    
            attribute float elevation;
    
            varying vec3 vPosition;
            varying float vElevation;
    
            void main() {
              vPosition = position;
              vElevation = elevation;
    
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`
        const fragmentShader = `
            precision highp float;
    
            uniform float min;
            uniform float max;
            uniform vec3 color;
    
            varying vec3 vPosition;
            varying float vElevation;
    
            void main() {
                float scale = (vElevation - min) / (max - min);
                gl_FragColor = vec4(color.r * scale, color.g * scale, color.b * scale, 1.0);
            }
        `

        super({
            side,
            uniforms,
            wireframe,
            transparent,
            vertexShader,
            fragmentShader,
        })
    }

    setMin(min) {
        if (!isNaN(min)) {
            this.uniforms.min = { value: min }
            this.uniformsNeedUpdate = true
        }
    }

    setMax(max) {
        if (!isNaN(max)) {
            this.uniforms.max = { value: max }
            this.uniformsNeedUpdate = true
        }
    }

    setColor(color) {
        if (color) {
            this.uniforms.color = new THREE.Uniform(new THREE.Color(color))
            this.uniformsNeedUpdate = true
        }
    }
}

export class DepthShaderMaterial extends THREE.ShaderMaterial {
    constructor(options = {}) {
        super(options)
    }
}

export class TilePickingMaterial extends THREE.ShaderMaterial {
    constructor(options = {}) {
        super(options)
    }
}
