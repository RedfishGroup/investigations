/* FILENAME: audio.js
 * AUTHOR: Hank Wikle
 * LAST MODIFIED: 29 May 2018
 * DESCRIPTION: Finds the time values of peaks in the given audio file (unfinished).
 *
 * NEXT STEPS: Learn how to use buffers/streaming, clean up global variables
 */

const LAG = 5;
const THRESHOLD = 3.5;
const INFLUENCE = 0;
const SAMPLE_RATE = 44100;

var trackLen;

window.onload = function() {

    // Set up Web Audio context and retrieve HTML audio object
    
    let reader = new FileReader();
    let audio = document.getElementById('input').files[0];
    reader.readAsArrayBuffer(audio);
    
    let offCtx = new OfflineAudioContext(1, LAG, SAMPLE_RATE);
    let source = offCtx.createBufferSource();
    let detector = offCtx.createPeakDetector(LAG, THRESHOLD, INFLUENCE); 
    let analyser = offCtx.createAnalyser();

    source.connect(detector.node);
    detector.node.connect(analyser);

    reader.onload = function() {
        offCtx.decodeAudioData(this.result, function(buffer) {
            source.buffer = buffer;
            trackLen = buffer.length;
            source.start();
            offCtx.startRendering().then(function(renderedBuffer) {
                console.log('Rendering completed successfully.');
                let peaks = offCtx.createBufferSource();
                peaks.buffer = renderedBuffer;
                console.log('peaks.buffer.length');
            });
        }); 

        console.log('File read successfully');
    };

    console.log('Finding peaks...');
}

function sum(a) {
    let total = 0;

    for (let i=0; i<a.length; i++)
        total += a[i];

    return total;
}

function avg(a) {return sum(a) / a.length};
