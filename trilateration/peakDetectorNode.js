/* FILENAME: peakDetectorNode.js
 * AUTHOR: Hank Wikle
 * LAST MODIFIED: 31 May 2018
 * DESCRIPTION: Implements custom audio node for peak detection using the Smoothed Z-Score Algorithm
 *              adapted from https://stackoverflow.com/a/22640362/6029703
 */

'use strict';

const IN_BUFFER_LENGTH = 256;

function peakDetectorNode(context, lag, zscore, influence, verbose=false) {
    let threshold = 0;
    let mu = 0;
    let lagWindow = new Array(lag).fill(0);

    console.log('Threshold:', threshold);
    console.log('Mu:', mu);
    console.log('Lag window:', lagWindow);

    this.node = context.createScriptProcessor(IN_BUFFER_LENGTH, 1, 1);
    this.node.onaudioprocess = function(e) {
        if (verbose)
            console.log('           Beginning peak detection...');
        let input = e.inputBuffer.getChannelData(0);
        let output = e.outputBuffer.getChannelData(0);
        
        for (let i=0; i<IN_BUFFER_LENGTH; i++) {
            if (verbose) {
                console.log('           Lag Window:', lagWindow);
                console.log('           mu:', mu);
                console.log('           threshold:', threshold);
            }

            if (Math.abs(input[i] - mu) > threshold) {
                output[i] = 1;
                lagWindow.push(influence * input[i] - (1 - influence) * lagWindow[-1]);
                let t = context.currentTime;
                console.log('Peak found:', t);
                if (verbose)
                    console.log('           Peak found:', context.currentTime);
            } else {
                output[i] = 0;
                lagWindow.push(input[i]);
                //console.log('No peak found');
            }
            lagWindow.shift();

            let meanStd = mean(lagWindow);
            mu = meanStd[0];
            threshold = zscore * meanStd[1];
        }
    }
}

AudioContext.prototype.createPeakDetector = function(lag, threshold, influence, verbose) {
    return new peakDetectorNode(this, lag, threshold, influence, verbose);
}

function mean(v) {
    let total = 0;

    for (let i=0; i<v.length; i++)
        total += v[i];

    let mean = total / v.length;

    let sqTotal = 0;

    for (let i=0; i<v.length; i++)
        sqTotal += Math.pow((v[i] - mean), 2);

    let std = sqTotal / v.length;
    let result = [mean, std];

    return result;
}

