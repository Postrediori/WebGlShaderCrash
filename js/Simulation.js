
var QUAD_VERTEX_SOURCE = [
    '#version 100',
    'precision highp float;',
    
    'attribute vec3 a_position;',

    'uniform mat4 u_projection;',
    'uniform mat4 u_view;',
    'uniform mat4 u_model;',
    
    'varying vec3 v_pos;',

    'void main (void) {',
        'v_pos = a_position;',
        'gl_Position = u_projection * u_view * u_model * vec4(a_position, 1.0);',
    '}',
].join('\n');

var QUAD_FRAGMENT_SOURCE_BASE = [
    '#version 100',
    'precision highp float;',

    'uniform int u_type;',
    'uniform vec3 u_shade;',
    'varying vec3 v_pos;',
    
    'const float StripePos = .2;',
    'const float StripeWidth2 = .025;',
    
    'bool inStripes(float c) {',
        'return abs(c-StripePos)<StripeWidth2 || abs(c+StripePos)<StripeWidth2;',
    '}',
    
    'vec4 color() {',
        'if (inStripes(v_pos.x) || inStripes(v_pos.y) || inStripes(v_pos.z)) {',
            'discard;',
        '}',
        'return vec4(v_pos+vec3(.5), 1.);',
    '}',
    
    'vec4 shade() {',
        'float c = u_shade.r;',
        'return vec4(vec3(c), 1.);',
    '}'
].join('\n');

var QUAD_FRAGMENT_SOURCE_TYPE_UNIVERSAL = [
	QUAD_FRAGMENT_SOURCE_BASE,
    'void main (void) {',
        '// This works everywhere',
		'gl_FragColor = shade() * color();',
    '}',
].join('\n');

var QUAD_FRAGMENT_SOURCE_TYPE_NOT_ON_WINDOWS = [
	QUAD_FRAGMENT_SOURCE_BASE,
    'void main (void) {',
        '// This crashes on Windows',
		'gl_FragColor = color() * shade();',
    '}',
].join('\n');

var Simulator = function(canvas, width, height) {
    var canvas = canvas;
    canvas.width = width;
    canvas.height = height;

    var rotationAngle = 0.0;

    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
        console.log("No WebGL");
    }
    else {
        console.log("WebGL Ver: "+gl.getParameter(gl.VERSION));
        console.log("WebGL Shader Language Ver: "+gl.getParameter(gl.SHADING_LANGUAGE_VERSION));
    }
    
    gl.clearColor.apply(gl, CLEAR_COLOR);
    gl.enable(gl.DEPTH_TEST);

    var quadProgramUniversal = gl.createProgram();
    var quadProgramUniversal = buildProgramWrapper(gl,
        buildShader(gl, gl.VERTEX_SHADER, QUAD_VERTEX_SOURCE),
        buildShader(gl, gl.FRAGMENT_SHADER, QUAD_FRAGMENT_SOURCE_TYPE_UNIVERSAL),
        {"a_position" : 0});
		
    var quadProgramNoWindows = gl.createProgram();
    var quadProgramNoWindows = buildProgramWrapper(gl,
        buildShader(gl, gl.VERTEX_SHADER, QUAD_VERTEX_SOURCE),
        buildShader(gl, gl.FRAGMENT_SHADER, QUAD_FRAGMENT_SOURCE_TYPE_NOT_ON_WINDOWS),
        {"a_position" : 0});

    var quadColor = new Float32Array([0.9, 0.9, 0.9]);
    var outlineColor = new Float32Array([0.1, 0.1, 0.1]);
    
    gl.enableVertexAttribArray(0);

    var cubeData = new Float32Array([
        -0.5,  0.5, -0.5,
        -0.5,  0.5,  0.5,
         0.5,  0.5,  0.5,
         0.5,  0.5, -0.5,

        -0.5, -0.5, -0.5,
         0.5, -0.5, -0.5,
         0.5, -0.5,  0.5,
        -0.5, -0.5,  0.5,
    ]);

    var cubeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeData, gl.STATIC_DRAW);

    var cubeIndices = new Int32Array([
        0, 3, 1,  3, 1, 2, // Top
        1, 2, 7,  2, 7, 6, // Front
        0, 1, 4,  1, 4, 7, // Left
        4, 5, 7,  5, 7, 6, // Bottom
        0, 3, 4,  3, 4, 5, // Back
        2, 3, 6,  3, 6, 5, // Right
    ]);

    var cubeIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeIndices), gl.STATIC_DRAW);

    var cubeOutlineIndices = new Int32Array([
        0, 1,  1, 2,  2, 3,  3, 0,
        1, 7,  7, 6,  6, 2,  2, 1,
        0, 4,  4, 7,  7, 1,  1, 0,
        4, 5,  5, 6,  6, 7,  7, 4,
        0, 3,  3, 5,  5, 4,  4, 0,
        2, 3,  3, 5,  5, 6,  6, 2,
    ]);

    var cubeOutlineIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeOutlineIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeOutlineIndices), gl.STATIC_DRAW);

    this.resize = function (width, height) {
        canvas.width = width;
        canvas.height = height;
    };
    
    this.render = function(deltaTime, projectionMatrix, viewMatrix) {
        rotationAngle += deltaTime;

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		this.renderCube(projectionMatrix, viewMatrix,
			new Float32Array([rotationAngle / 3., rotationAngle]), 
			new Float32Array([-1., 0., 0.]), 1);
			
		this.renderCube(projectionMatrix, viewMatrix,
			new Float32Array([rotationAngle / 3., -rotationAngle]), 
			new Float32Array([1., 0., 0.]), 2);
    }
	
	this.renderCube = function(projectionMatrix, viewMatrix, rotation, translation, type) {
		// Setup buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 3 * SIZE_OF_FLOAT, 0);

        // Setup MVP matrices
		var modelMatrix = makeIdentityMatrix(new Float32Array(16));

        var xRotationMatrix = makeXRotationMatrix(new Float32Array(16), rotation[0]);
        var yRotationMatrix = makeYRotationMatrix(new Float32Array(16), rotation[1]);
        premultiplyMatrix(modelMatrix, modelMatrix, xRotationMatrix);
        premultiplyMatrix(modelMatrix, modelMatrix, yRotationMatrix);

        var translationMatrix = makeTranslationMatrix(new Float32Array(16), translation);
        premultiplyMatrix(modelMatrix, modelMatrix, translationMatrix);

        // Select shader for cube faces
		var quadProgram = type == 1 ? quadProgramUniversal : quadProgramNoWindows;

        // Draw Cube Faces
        gl.useProgram(quadProgram.program);

        gl.uniformMatrix4fv(quadProgram.uniformLocations['u_projection'], false, projectionMatrix);
        gl.uniformMatrix4fv(quadProgram.uniformLocations['u_view'], false, viewMatrix);
        gl.uniformMatrix4fv(quadProgram.uniformLocations['u_model'], false, modelMatrix);

        gl.uniform3fv(quadProgram.uniformLocations['u_shade'], quadColor);

        gl.polygonOffset(1, 0);
        gl.enable(gl.POLYGON_OFFSET_FILL);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);
        gl.drawElements(gl.TRIANGLES, cubeIndices.length, gl.UNSIGNED_SHORT, 0);

        // Draw Cube Edges
        quadProgram = quadProgramUniversal;
    
        gl.useProgram(quadProgram.program);

        gl.uniformMatrix4fv(quadProgram.uniformLocations['u_projection'], false, projectionMatrix);
        gl.uniformMatrix4fv(quadProgram.uniformLocations['u_view'], false, viewMatrix);
        gl.uniformMatrix4fv(quadProgram.uniformLocations['u_model'], false, modelMatrix);

        gl.uniform3fv(quadProgram.uniformLocations['u_shade'], quadColor);

        gl.polygonOffset(0, 0);
        gl.disable(gl.POLYGON_OFFSET_FILL);

        gl.uniform3fv(quadProgram.uniformLocations['u_shade'], outlineColor);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeOutlineIndexBuffer);
        gl.drawElements(gl.LINES, cubeOutlineIndices.length, gl.UNSIGNED_SHORT, 0);
	}
}
