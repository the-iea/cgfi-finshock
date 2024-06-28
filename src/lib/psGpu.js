class psGpu {
	constructor(options = {}) {
		let opts = psGpu.BaseOpts
		Object.entries(options).forEach((o) => {
			opts[o[0]] = o[1]
		})

		let canvas = document.createElement('canvas')
		canvas.height = opts.height
		canvas.width = opts.width

		const gl = canvas.getContext('webgl2')
		// If we don't have a GL context, give up now
		if (!gl) {
			throw new Error(
				'Unable to initialize WebGL. Your browser or machine may not support it.',
			)
		}

		this._ = {
			opts: opts,
			gl: gl,
			programs: {},
			buffers: {},
		}

		// Create a dummy program. It does nothing but pass the textures
		// through. It's safe and cheap to run.
		this.addProgram(
			'',
			`
			precision mediump float;

			// our texture
			uniform sampler2D u_image;
			// the texCoords passed in from the vertex shader.
			varying vec2 v_texCoord;

			void main() {
				gl_FragColor = texture2D(u_image, v_texCoord);
			}
		`,
		)
	}

	get gl() {
		return this._.gl
	}

	get width() {
		return this.gl.drawingBufferWidth
	}
	get height() {
		return this.gl.drawingBufferHeight
	}

	static get BaseOpts() {
		return {
			height: 1,
			width: 1,
			PixelType: Uint8Array,
		}
	}

	sanitizeRect(dim = {}) {
		dim.x = dim.x || 0
		dim.y = dim.y || 0
		dim.width = dim.width || this.width
		dim.height = dim.height || this.height
		if (this.width < dim.width + dim.x) {
			dim.width = this.width - dim.x
		}
		if (this.height < dim.height + dim.y) {
			dim.height = this.height - dim.y
		}

		return dim
	}

	emptyData(dim = {}) {
		dim = this.sanitizeRect(dim)
		let pixels = new Uint8Array(dim.width * dim.height * 4)
		return pixels
	}

	read(dim = {}) {
		const gl = this.gl
		dim = this.sanitizeRect(dim)
		let pixels = this.emptyData(dim)

		// grab the buffer that is most appropriate for reading from
		//console.debug('Buffer: ' + this._.textures.read.id + ' -> 😐');
		this.gl.bindFramebuffer(
			this.gl.FRAMEBUFFER,
			this._.textures.read.framebuffer,
		)

		gl.readPixels(
			dim.x,
			dim.y,
			dim.width,
			dim.height,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			pixels,
			0,
		)
		return pixels
	}

	write(pixels, dim = {}) {
		let gl = this.gl
		dim = this.sanitizeRect(dim)

		// whichever buffer we write to will become the best one to read from
		// may as well just use the current read buffer
		//console.debug('Buffer: 😐 -> ' + this._.textures.read.id);
		this.gl.bindTexture(this.gl.TEXTURE_2D, this._.textures.read.texture)

		gl.texSubImage2D(
			gl.TEXTURE_2D,
			0,
			dim.x,
			dim.y,
			dim.width,
			dim.height,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			pixels,
			0,
		)
	}

	run(name = '') {
		if (!name) {
			name = ''
		}
		if (this.CurrentProgram !== name) {
			this.CurrentProgram = name
			this.initProgram(name)
		}

		// get the read buffer
		let read = this._.textures.read
		// the write buffer is the one we aren't reading from
		let write = this._.textures.alt
		// whichever one we just wrote to is now the one we should be reading from.
		this._.textures.read = write
		this._.textures.alt = read
		//console.debug('Buffer: ' + read.id + ' -> ' + write.id);

		this.gl.bindTexture(this.gl.TEXTURE_2D, read.texture)
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, write.framebuffer)
		this.gl.drawArrays(this.gl.TRIANGLES, 0, 6)
	}

	initMemory() {
		let gl = this.gl

		// Create a buffer to put three 2d clip space points in
		let position = (this._.buffers.position = gl.createBuffer())

		// Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
		gl.bindBuffer(gl.ARRAY_BUFFER, position)
		// Set a rectangle the same size as the image.
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array([
				0,
				0,
				gl.drawingBufferWidth,
				0,
				0,
				gl.drawingBufferHeight,
				0,
				gl.drawingBufferHeight,
				gl.drawingBufferWidth,
				0,
				gl.drawingBufferWidth,
				gl.drawingBufferHeight,
			]),
			gl.STATIC_DRAW,
		)

		// provide texture coordinates for the rectangle.
		let texcoord = (this._.buffers.texcoord = gl.createBuffer())
		gl.bindBuffer(gl.ARRAY_BUFFER, texcoord)
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array([
				0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0,
			]),
			gl.STATIC_DRAW,
		)

		// Create a texture.
		const pixel = this.emptyData()
		this._.textures = [0, 1].map((d) => {
			let texture = gl.createTexture()
			gl.bindTexture(gl.TEXTURE_2D, texture)
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				gl.RGBA,
				gl.drawingBufferWidth,
				gl.drawingBufferHeight,
				0,
				gl.RGBA,
				gl.UNSIGNED_BYTE,
				pixel,
				0,
			)

			// Not concerned with it being a power of 2
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

			let frameBuffer = gl.createFramebuffer()
			gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer)
			gl.framebufferTexture2D(
				gl.FRAMEBUFFER,
				gl.COLOR_ATTACHMENT0,
				gl.TEXTURE_2D,
				texture,
				0,
			)

			return {
				id: d,
				texId: gl.TEXTURE0 + d,
				texture: texture,
				framebuffer: frameBuffer,
			}
		})
		// bind the textures
		this._.textures.read = this._.textures[0]
		this._.textures.alt = this._.textures[1]
	}

	initProgram(name) {
		let gl = this.gl
		// setup GLSL program
		var program = this._.programs[name]

		// look up where the vertex data needs to go.
		let positionLocation = program.attribs.position
		let texcoordLocation = program.attribs.texcoord

		// Tell WebGL how to convert from clip space to pixels
		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)

		// Tell it to use our program (pair of shaders)
		gl.useProgram(program.program)

		// Turn on the position attribute
		gl.enableVertexAttribArray(positionLocation)
		gl.bindBuffer(gl.ARRAY_BUFFER, this._.buffers.position)
		gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

		// Turn on the texcoord attribute
		gl.enableVertexAttribArray(texcoordLocation)
		gl.bindBuffer(gl.ARRAY_BUFFER, this._.buffers.texcoord)
		gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0)

		// lookup uniforms
		let resolutionLocation = program.uniforms.resolution
		gl.uniform2f(
			resolutionLocation,
			gl.drawingBufferWidth,
			gl.drawingBufferHeight,
		)
		/* MATCH = 2; SKIP = -1; MISMATCH = -1; */
		let scores = program.uniforms.scores
		let sValues = [2, -1, -1].map((d) => {
			return d / 256.0
		})
		gl.uniform3fv(scores, sValues)
	}

	addProgram(name, fsSource) {
		const gl = this.gl

		// Vertex shader program
		const vsSource = `
			precision mediump float;

			attribute vec2 a_position;
			attribute vec2 a_texCoord;

			uniform vec2 u_resolution;
			varying vec2 v_texCoord;

			void main() {
				// convert the rectangle from pixels to 0.0 to 1.0
				vec2 zeroToOne = a_position / u_resolution;
				vec2 zeroToTwo = zeroToOne * 2.0;
				vec2 clipSpace = zeroToTwo - 1.0;
				gl_Position = vec4(clipSpace * vec2(1, 1), 0, 1);
				// pass the texCoord to the fragment shader
				v_texCoord = a_texCoord;
			}
		`

		let shaders = [
			{ type: 'VERTEX', typeId: gl.VERTEX_SHADER, source: vsSource },
			{ type: 'FRAGMENT', typeId: gl.FRAGMENT_SHADER, source: fsSource },
		]
			.map((s) => {
				const shader = gl.createShader(s.typeId)
				gl.shaderSource(shader, s.source)
				gl.compileShader(shader)
				if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
					gl.deleteShader(shader)
					throw new Error(
						`An error occurred compiling the shaders (${name}): ` +
							gl.getShaderInfoLog(shader),
					)
				}
				s.shader = shader
				return s
			})
			.reduce((a, d) => {
				a[d.type] = d
				return a
			}, {})
		// Create the shader program
		const shaderProgram = gl.createProgram()
		gl.attachShader(shaderProgram, shaders.VERTEX.shader)
		gl.attachShader(shaderProgram, shaders.FRAGMENT.shader)
		gl.linkProgram(shaderProgram)

		gl.deleteShader(shaders.VERTEX.shader)
		gl.deleteShader(shaders.FRAGMENT.shader)

		// If creating the shader program failed
		if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
			throw new Error(
				`Unable to initialize the shader program (${name}): ` +
					gl.getProgramInfoLog(shaderProgram),
			)
		}

		this._.programs[name] = {
			program: shaderProgram,
			attribs: {
				position: gl.getAttribLocation(shaderProgram, 'a_position'),
				texcoord: gl.getAttribLocation(shaderProgram, 'a_texCoord'),
			},
			uniforms: {
				resolution: gl.getUniformLocation(shaderProgram, 'u_resolution'),
				scores: gl.getUniformLocation(shaderProgram, 'scores'),
			},
		}
		return this
	}
}

function drawGrid(gpu, runMetrics) {
	let values = gpu.read()

	let table = document.querySelector('table')
	table.innerHTML = '<caption></caption><tbody></tbody>'

	let caption = table.querySelector('caption')
	let times = window.performance.getEntriesByType('measure')
	caption.innerHTML =
		'Cycles........: ' +
		runMetrics.cycle +
		'\n' +
		'Timings (ms)..: ' +
		times
			.reduce((a, d) => {
				return a + d.duration
			}, 0)
			.toFixed(1) +
		'<ul>' +
		times
			.map((d) => {
				return '<li>' + d.name + ': ' + d.duration.toFixed(1) + ';</li>'
			})
			.join('') +
		'</ul>' +
		'Last Kernel...: ' +
		gpu.CurrentProgram

	table = table.tBodies[0]
	table.innerHTML = ''
	let tr = table.insertRow(-1)
	let th = document.createElement('th')
	th.innerHTML = '&nbsp;'
	tr.append(th)
	runMetrics.inbound.a.forEach((d, i) => {
		let th = document.createElement('th')
		th.innerHTML = String.fromCharCode(d).toUpperCase() + '<sub>' + i + '</sub>'
		tr.append(th)
	})
	for (let y = 0, i = 0; y < gpu.gl.drawingBufferHeight; y++) {
		tr = table.insertRow(-1)
		let th = document.createElement('th')
		th.innerHTML =
			String.fromCharCode(runMetrics.inbound.b[y]).toUpperCase() +
			'<sub>' +
			y +
			'</sub>'
		tr.append(th)
		for (let x = 0; x < gpu.gl.drawingBufferWidth; x++, i++) {
			let pix = new pixel(values, i * 4)

			let td = document.createElement('td')
			td.innerHTML = pix.values
				.map((d) => {
					let str = d.toString().split('')
					while (str.length < 3) {
						str.unshift(String.fromCharCode(160))
					}
					str = str.join('')
					return '<i>' + str + '</i>'
				})
				.join(' ')
			tr.append(td)
		}
	}
}

export { psGpu, drawGrid }
