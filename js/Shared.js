
/*
 * Constants
 */

var SIMULATOR_CANVAS_ID = 'simulator';

var CLEAR_COLOR = [0.5, 0.5, 0.5, 1.0];

var SIZE_OF_FLOAT = 4;

var FOV = (60 / 180) * Math.PI,
    NEAR = 1,
    FAR = 10000,
    MIN_ASPECT = 16 / 9;

var CAMERA_DISTANCE = 3;

/*
 * Shader Routines
 */

var buildShader = function (gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
};

var buildProgramWrapper = function (gl, vertexShader, fragmentShader, attributeLocations) {
    var programWrapper = {};

    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    for (var attributeName in attributeLocations) {
        gl.bindAttribLocation(program, attributeLocations[attributeName], attributeName);
    }
    gl.linkProgram(program);
    var uniformLocations = {};
    var numberOfUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < numberOfUniforms; i += 1) {
        var activeUniform = gl.getActiveUniform(program, i),
            uniformLocation = gl.getUniformLocation(program, activeUniform.name);
        uniformLocations[activeUniform.name] = uniformLocation;
    }

    programWrapper.program = program;
    programWrapper.uniformLocations = uniformLocations;

    return programWrapper;
};

/*
 * Matrix Routines
 */

var makeIdentityMatrix = function (matrix) {
    matrix[0] = 1.0;
    matrix[1] = 0.0;
    matrix[2] = 0.0;
    matrix[3] = 0.0;
    matrix[4] = 0.0;
    matrix[5] = 1.0;
    matrix[6] = 0.0;
    matrix[7] = 0.0;
    matrix[8] = 0.0;
    matrix[9] = 0.0;
    matrix[10] = 1.0;
    matrix[11] = 0.0;
    matrix[12] = 0.0;
    matrix[13] = 0.0;
    matrix[14] = 0.0;
    matrix[15] = 1.0;
    return matrix;
};

var makeXRotationMatrix = function (matrix, angle) {
    matrix[0] = 1.0;
    matrix[1] = 0.0;
    matrix[2] = 0.0;
    matrix[3] = 0.0;
    matrix[4] = 0.0;
    matrix[5] = Math.cos(angle);
    matrix[6] = Math.sin(angle);
    matrix[7] = 0.0;
    matrix[8] = 0.0;
    matrix[9] = -Math.sin(angle);
    matrix[10] = Math.cos(angle);
    matrix[11] = 0.0;
    matrix[12] = 0.0;
    matrix[13] = 0.0;
    matrix[14] = 0.0;
    matrix[15] = 1.0;
    return matrix;
};

var makeYRotationMatrix = function (matrix, angle) {
    matrix[0] = Math.cos(angle);
    matrix[1] = 0.0;
    matrix[2] = -Math.sin(angle);
    matrix[3] = 0.0;
    matrix[4] = 0.0;
    matrix[5] = 1.0;
    matrix[6] = 0.0;
    matrix[7] = 0.0;
    matrix[8] = Math.sin(angle);
    matrix[9] = 0.0;
    matrix[10] = Math.cos(angle);
    matrix[11] = 0.0;
    matrix[12] = 0.0;
    matrix[13] = 0.0;
    matrix[14] = 0.0;
    matrix[15] = 1.0;
    return matrix;
};

var premultiplyMatrix = function (out, matrixA, matrixB) {
    var b0 = matrixB[0], b4 = matrixB[4], b8 = matrixB[8], b12 = matrixB[12],
        b1 = matrixB[1], b5 = matrixB[5], b9 = matrixB[9], b13 = matrixB[13],
        b2 = matrixB[2], b6 = matrixB[6], b10 = matrixB[10], b14 = matrixB[14],
        b3 = matrixB[3], b7 = matrixB[7], b11 = matrixB[11], b15 = matrixB[15],

        aX = matrixA[0], aY = matrixA[1], aZ = matrixA[2], aW = matrixA[3];
    out[0] = b0 * aX + b4 * aY + b8 * aZ + b12 * aW;
    out[1] = b1 * aX + b5 * aY + b9 * aZ + b13 * aW;
    out[2] = b2 * aX + b6 * aY + b10 * aZ + b14 * aW;
    out[3] = b3 * aX + b7 * aY + b11 * aZ + b15 * aW;

    aX = matrixA[4], aY = matrixA[5], aZ = matrixA[6], aW = matrixA[7];
    out[4] = b0 * aX + b4 * aY + b8 * aZ + b12 * aW;
    out[5] = b1 * aX + b5 * aY + b9 * aZ + b13 * aW;
    out[6] = b2 * aX + b6 * aY + b10 * aZ + b14 * aW;
    out[7] = b3 * aX + b7 * aY + b11 * aZ + b15 * aW;

    aX = matrixA[8], aY = matrixA[9], aZ = matrixA[10], aW = matrixA[11];
    out[8] = b0 * aX + b4 * aY + b8 * aZ + b12 * aW;
    out[9] = b1 * aX + b5 * aY + b9 * aZ + b13 * aW;
    out[10] = b2 * aX + b6 * aY + b10 * aZ + b14 * aW;
    out[11] = b3 * aX + b7 * aY + b11 * aZ + b15 * aW;

    aX = matrixA[12], aY = matrixA[13], aZ = matrixA[14], aW = matrixA[15];
    out[12] = b0 * aX + b4 * aY + b8 * aZ + b12 * aW;
    out[13] = b1 * aX + b5 * aY + b9 * aZ + b13 * aW;
    out[14] = b2 * aX + b6 * aY + b10 * aZ + b14 * aW;
    out[15] = b3 * aX + b7 * aY + b11 * aZ + b15 * aW;

    return out;
};

var makePerspectiveMatrix = function (matrix, fov, aspect, near, far) {
    var f = Math.tan(0.5 * (Math.PI - fov)),
        range = near - far;

    matrix[0] = f / aspect;
    matrix[1] = 0;
    matrix[2] = 0;
    matrix[3] = 0;
    matrix[4] = 0;
    matrix[5] = f;
    matrix[6] = 0;
    matrix[7] = 0;
    matrix[8] = 0;
    matrix[9] = 0;
    matrix[10] = far / range;
    matrix[11] = -1;
    matrix[12] = 0;
    matrix[13] = 0;
    matrix[14] = (near * far) / range;
    matrix[15] = 0.0;

    return matrix;
};
