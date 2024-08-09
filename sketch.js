let font;
let album_title;
let rotationSpeed = 0.0;
let rotationAngle = 0.0;
var canvas;
var radialArcs = [];
var fft;
var soundFile;
var soundSpectrum;

// Initialise assets 
function preload() {
  font = loadFont('assets/Limelight-Regular.ttf');
  soundFormats('mp3');
  soundFile = loadSound('assets/EchoSaxEnd.mp3');
  album_title = "Play";
}

// Setup canvas
function setup() {
  colorMode(HSB,360,100,100);
  frameRate(60);

  canvas = createCanvas(windowWidth, windowHeight);

  mp3();

  textFont(font);
  textSize(40);
  textAlign(CENTER, (CENTER));
}

// Setup music
function mp3() {
  initRadialArcs();
  initSound(); 
  soundFile.setVolume(0);
  canvas.mouseClicked(togglePlay);
}

function draw() {
  let amplitude = fft.getEnergy("bass") + fft.getEnergy("treble");
  amplitude /= 2;

  // Map the amplitude to the HSB hue range
  let hue = map(amplitude, 0, 255 * 2, 250, 360);
  
  // Set the background color based on the calculated hue
  background(hue, 100, 25);

  // If sound file exists, analyze sound, update and draw radial arcs
  if(soundFile) {
    analyseSound();
    updateRadialArcs();
    drawRadialArcs();
  }
  
  // Album title with rotation animation
  translate(windowWidth / 2, windowHeight / 2); 
  rotate(rotationAngle);
  fill(255);
  stroke(15);
  strokeWeight(10);
  text(album_title, 0, 0);
  textSize(25);
}

function initRadialArcs() {
  // arc count , minRadius, maxRadius, rotation, maxStrokeWidth, minHue, maxHue
  radialArcs[0] = new RadialArcs(60, height/4, width * 1.5, 0, 3, 200, 340); // bass
  radialArcs[1] = new RadialArcs(100, height/4, width * 1.5, -HALF_PI, 5, 200, 275); // treb
}

function updateRadialArcs() {
  if(soundFile.isPlaying()) {
    // Update the radial arcs with new sound data values for bass and treble frequencies
    radialArcs[0].updateArcs(getNewSoundDataValue("bass"));
    radialArcs[1].updateArcs(getNewSoundDataValue("treble"));
  }
}

function drawRadialArcs() {
  radialArcs[0].drawArcs(); // bass
  radialArcs[1].drawArcs(); // treb
}

class RadialArcs {
  constructor(arcCount, minRadius, maxRadius, baselineRadius, maxStroke, minHue, maxHue) {
    this.arcCount = arcCount;
    this.minRadius = minRadius;
    this.maxRadius = maxRadius;
    this.radialArcs = [];
    this.baselineRadius = baselineRadius;
    this.maxStroke = maxStroke;
    this.minHue = minHue;
    this.maxHue = maxHue;
    this.initializeArcs();
  }

  initializeArcs() {
    // Loop through each arc and create a new RadialArc object with specified parameters
    for (let i = 0; i < this.arcCount; i++) {
      this.radialArcs[i] = new RadialArc(
        i,
        this.arcCount,
        this.minRadius,
        this.maxRadius,
        this.baselineRadius,
        this.maxStroke,
        this.minHue,
        this.maxHue
      );
    }
  }

  // Update radial arcs with new data in reverse order
  updateArcs(data) {
    for (let i = this.radialArcs.length - 1; i >= 0; i--) {
      const value = i > 0 ? this.radialArcs[i - 1].getValue() : data;
      this.radialArcs[i].setValue(value);
    }
  }

  // Draw all radial arcs
  drawArcs() {
    this.radialArcs.forEach(arc => arc.redrawFromData());
  }
}
 
class RadialArc { 
  constructor(id, arcs, minR, maxR, baseR, maxStr, minH, maxH) {
    // Properties initialization
    this.arcID = id;
    this.totalArcs = arcs;
    this.minRadius = minR; 
    this.maxRadius = maxR;
    this.maxStroke = maxStr;
    this.minHue = minH;
    this.maxHue = maxH;
    this.dataVal = 0;

    // Calculated properties
    this.arcRadius = this.calculateArcRadius();
    this.centerX = width / 2; 
    this.centerY = height / 2;
    this.arcMaxRadian = QUARTER_PI;
    this.arcBaseline = baseR;
    this.arcStartRadian = 0; 
    this.arcEndRadian = 0; 
  }

  // Set the data value
  setValue(d) {
    this.dataVal = d;
  }

  // Get the data value
  getValue() {
    return this.dataVal;
  }

  // Update and redraw the arc based on data
  redrawFromData() {
    this.updateArc();
    this.drawArc(); 
  }

  // Update the arc based on data and rotation
  updateArc() {
    const rotationSpeedIncrement = 0.0000025;
    const maxRotationSpeed = 0.015;

    // Set rotation speed based on if song playing
    if (soundFile.isPlaying() && rotationSpeed <= maxRotationSpeed) {
      rotationSpeed += rotationSpeedIncrement;
    } else if (!soundFile.isPlaying() && rotationSpeed > 0.0) {
      rotationSpeed -= rotationSpeedIncrement;
    }

    this.arcBaseline += rotationSpeed;
    rotationAngle = this.arcBaseline + HALF_PI;

    // Calculate end angle of the arc from baseline angle and the maximum radian multiplied by the data value
    this.arcEndRadian = this.arcBaseline + (this.arcMaxRadian * this.dataVal);
    // Calculate start angle of the arc from baseline angle and the maximum radian multiplied by the data value
    this.arcStartRadian = this.arcBaseline - (this.arcMaxRadian * this.dataVal);
  }

  // Draw the arc based on data
  drawArc() {
    this.dataColor = this.getDataHSBColor(this.dataVal);
    stroke(this.dataColor);
    strokeWeight(map(this.dataVal, 0, 1, 0, this.maxStroke));
    noFill();
    arc(this.centerX, this.centerY, this.arcRadius, this.arcRadius, this.arcStartRadian, this.arcEndRadian);
    arc(this.centerX, this.centerY, this.arcRadius, this.arcRadius, this.arcStartRadian - PI, this.arcEndRadian - PI);
  }

  // Calculate HSB color based on data value
  getDataHSBColor(d) {
    const saturationRange = [50, 70];
    const brightnessRange = [80, 100];

    const dataHue = map(d, 0, 1, this.minHue, this.maxHue);
    const dataSaturation = map(d, 0, 1, ...saturationRange);
    const dataBrightness = map(d, 0, 1, ...brightnessRange);

    return color(dataHue, dataSaturation, dataBrightness);
  }

  // Calculate the current arc radius
  calculateArcRadius() {
    return this.minRadius + (((this.maxRadius - this.minRadius) / this.totalArcs) * (this.arcID + 1));
  }
}

// Function to get new sound data value based on frequency type
function getNewSoundDataValue(freqType) {
  let energy = fft.getEnergy(freqType);
  if (freqType === 'bass') {
    // Map energy for bass frequencies
    return map(energy, 0, 255, 0, 1.2);
  } else if (freqType === 'treble') {
    // Map energy for treble frequencies
    return map(energy, 0, 255, 0, 7); 
  }
}

// Function to initialize sound with Fast Fourier Transform (FFT) object
function initSound() {
  fft = new p5.FFT(0.6, 2048); 
  soundFile.amp(1); 
}

// Function to toggle play/pause of sound
function togglePlay() {
  if (soundFile.isPlaying()) {
    soundFile.pause();
    soundFile.setVolume(0);
  } else {
    album_title = "Epic Sax";
    soundFile.setVolume(1, 4, 0);
    soundFile.loop();
  }
}

// Function to analyze sound spectrum using FFT
function analyseSound() {
  soundSpectrum = fft.analyze();
}