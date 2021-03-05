
var main = function () {
    var simulatorCanvas = document.getElementById(SIMULATOR_CANVAS_ID);

    var simulator = new Simulator(simulatorCanvas, 640, 480);

    var projectionMatrix = makePerspectiveMatrix(new Float32Array(16), FOV, MIN_ASPECT, NEAR, FAR);
    var viewMatrix = makeIdentityMatrix(new Float32Array(16));
    var distanceTranslationMatrix = makeTranslationMatrix(new Float32Array(16), new Float32Array([0, 0, -CAMERA_DISTANCE]));
    premultiplyMatrix(viewMatrix, viewMatrix, distanceTranslationMatrix);
    
    var onresize = function () {
        var windowWidth = window.innerWidth,
            windowHeight = window.innerHeight;

        if (windowWidth / windowHeight > MIN_ASPECT) {
            makePerspectiveMatrix(projectionMatrix, FOV, windowWidth / windowHeight, NEAR, FAR);
            simulator.resize(windowWidth, windowHeight);
        } else {
            var newHeight = windowWidth / MIN_ASPECT;
            makePerspectiveMatrix(projectionMatrix, FOV, windowWidth / newHeight, NEAR, FAR);
            simulator.resize(windowWidth, newHeight);
            simulatorCanvas.style.top = (windowHeight - newHeight) * 0.5 + 'px';
        }
    };

    window.addEventListener('resize', onresize);
    onresize();

    var lastTime = (new Date()).getTime();
    var render = function render (currentTime) {
        var deltaTime = (currentTime - lastTime) / 1000 || 0.0;
        lastTime = currentTime;

        simulator.render(deltaTime, projectionMatrix, viewMatrix);

        requestAnimationFrame(render);
    };
    render();
}

main();
