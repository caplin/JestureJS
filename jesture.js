function Jesture(videoId, canvasId, callback) {

    this.video = document.querySelector("#" + videoId);
    this.canvas = document.querySelector('#' + canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.localMediaStream = null;
    this.callback = callback;

    this.previousData = false;
    this.previousXPoints = [];
    this.previousYPoints = [];

    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
    window.URL = window.URL || window.webkitURL;

    var self = this;
    navigator.getUserMedia({video: true}, function (stream) {
        self.video.src = window.URL.createObjectURL(stream);
        self.localMediaStream = stream;
    }, function () {
        self.onCameraFail()
    });

    setInterval(function () {
        self.snapshot()
    }, 100)

}

Jesture.prototype.THRESHOLD = 100;
Jesture.prototype.SHOW_MASK = true;


Jesture.prototype.onCameraFail = function (e) {
    console.log('Camera did not work.', e);
};


Jesture.prototype.snapshot = function () {
    {
        if (this.localMediaStream) {
            this.ctx.drawImage(this.video, 0, 0);

            var rawImage = this.ctx.getImageData(0, 0, 640, 480);
            var renderedImage = this.ctx.getImageData(0, 0, 640, 480);
            var data = rawImage.data;
            var newImageData = renderedImage.data;

            var total = {x: 0, y: 0, count: 0};

            if (this.previousData) {
                for (var i = 0; i < data.length; i += 4) {
                    var r = (data[i] - this.previousData[i] < 0) ? 0 : data[i] - this.previousData[i];
                    var g = (data[i + 1] - this.previousData[i + 1] < 0) ? 0 : data[i + 1] - this.previousData[i + 1];
                    var b = (data[i + 2] - this.previousData[i + 2] < 0) ? 0 : data[i + 2] - this.previousData[i + 2];
                    if (this.SHOW_MASK) {
                        newImageData[i] = r;
                        newImageData[i + 1] = g;
                        newImageData[i + 2] = b;

                    }
                    if (r + g + b > this.THRESHOLD * 2) {
                        this.calculateIntensity(newImageData, i, total, {r: 120, g: 120, b: 255});
                    }
                    if (r + g + b > this.THRESHOLD * 3) {
                        this.calculateIntensity(newImageData, i, total, {r: 120, g: 255, b: 120});
                    }
                    if (r + g + b > this.THRESHOLD * 4) {
                        this.calculateIntensity(newImageData, i, total, {r: 255, g: 200, b: 120});
                    }
                    if (r + g + b > this.THRESHOLD * 5) {
                        this.calculateIntensity(newImageData, i, total, {r: 255, g: 120, b: 120});
                    }
                }

            }

            var averageX = total.x / total.count;
            var averageY = total.y / total.count;
            averageX = Math.floor(averageX / 30) * 30;
            averageY = Math.floor(averageY / 30) * 30;


            if (total.count > 1000) {
                this.timeoutCount = 0;

                if (!this.cooldown)
                {
                    this.drawSquare(newImageData, averageX, averageY, 12, {r: 255, g: 200, b: 0});
                }
                else
                {
                    this.drawSquare(newImageData, averageX, averageY, 12, {r: 120, g: 100, b: 0});
                }

                for (var i = 0; i < this.previousXPoints.length; i++) {
                    var xx = this.previousXPoints[i];
                    var yy = this.previousYPoints[i];

                    if (!this.cooldown)
                    this.drawSquare(newImageData, xx, yy, i, {r: 255, g: 200, b: 0});
                    else
                        this.drawSquare(newImageData, xx, yy, i, {r: 120, g: 100, b: 0});


                }

                if (this.previousXPoints.length > 3 && !this.cooldown) {
                    var countRight = 0;
                    var countLeft = 0;
                    var countUp = 0;
                    var countDown = 0;
                    for (var i = this.previousXPoints.length - 4; i < this.previousXPoints.length - 1; i++) {
                        if (this.isGreaterThanPrevious(this.previousXPoints[i], this.previousXPoints[i + 1])) {
                            countLeft++;
                        }
                        if (this.isLessThanPrevious(this.previousXPoints[i], this.previousXPoints[i + 1])) {
                            countRight++;
                        }
                        if (this.isGreaterThanPrevious(this.previousYPoints[i], this.previousYPoints[i + 1])) {
                            countDown++;
                        }
                        if (this.isLessThanPrevious(this.previousYPoints[i], this.previousYPoints[i + 1])) {
                            countUp++;
                        }

                    }

                    var xRange = (this.previousXPoints[this.previousXPoints.length - 1] - this.previousXPoints[this.previousXPoints.length - 8]);
                    var yRange = (this.previousYPoints[this.previousYPoints.length - 1] - this.previousYPoints[this.previousYPoints.length - 8]);
                    if (countRight > 2 && xRange <= -90) {
                        if (this.callback.onRight) {
                            this.callback.onRight();
                            this.cooldownAndResetTrail();
                        }
                    }
                    else if (countLeft > 2 && xRange >= 90) {
                        if (this.callback.onLeft) {
                            this.callback.onLeft();
                            this.cooldownAndResetTrail();
                        }
                    }
                    else if (countUp > 2 && yRange <= -90) {
                        if (this.callback.onUp) {
                            this.callback.onUp();
                            this.cooldownAndResetTrail();
                        }
                    }
                    else if (countDown > 2 && yRange >= 90) {
                        if (this.callback.onDown) {
                            this.callback.onDown();
                            this.cooldownAndResetTrail();
                        }
                    }

                    var self = this;
                    if (this.cooldown) {
                        setTimeout(function () {
                            self.cooldown = false;
                            self.previousXPoints = [];
                            self.previousYPoints = [];
                        }, 1000);
                    }

                }
                if (this.previousXPoints.length > 10) {
                    this.previousXPoints = this.previousXPoints.slice(1);
                    this.previousYPoints = this.previousYPoints.slice(1);
                }

                this.previousXPoints.push(averageX);
                this.previousYPoints.push(averageY);
            }
            else {
                if (this.timeoutCount > 4) {
                    this.previousXPoints = [];
                    this.previousYPoints = [];

                }
                else {
                    this.timeoutCount++;
                }

            }

            this.ctx.putImageData(renderedImage, 0, 0);

            this.previousData = data;

        }
    }
}

Jesture.prototype.isGreaterThanPrevious = function (first, second) {
    if (isNaN(first) || isNaN(second)) return false;

    return first <= second;
}
Jesture.prototype.isLessThanPrevious = function (first, second) {
    if (isNaN(first) || isNaN(second)) return false;

    return first >= second;
}

Jesture.prototype.drawSquare = function (imageData, averageX, averageY, radius, color) {
    for (x = 0 - radius; x < radius; x++) {
        for (y = 0 - radius; y < radius; y++) {
            var index = parseInt((Math.floor(averageX) + x) + (Math.floor((averageY) + y) * 640)) * 4;

            imageData[index] = color.r;
            imageData[index + 1] = color.g;
            imageData[index + 2] = color.b;
        }
    }

}
Jesture.prototype.cooldownAndResetTrail = function () {

    this.cooldown = true;
    this.previousXPoints = [];
    this.previousYPoints = [];
}

Jesture.prototype.calculateIntensity = function (imageData, i, total, color) {
    var x = (i / 4) % 640;
    var y = (i / 4) / 640;
    total.x += x;
    total.y += y;
    total.count++;

    imageData[i] = color.r;
    imageData[i + 1] = color.g;
    imageData[i + 2] = color.b;
}


