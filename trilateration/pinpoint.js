/* Filename: pinpoint.js
 * Author: Hank Wikle
 * Last modified 29 May 2018
 * Computes the location of a sound source based on sensor locations and times at which each received the sound signal.
 */

V_SOUND = 343; // Speed of sound (meters per second)

function pinpoint(sensors, times, verbose=false) {
    /* Computes the location of a sound source. Requires at least four sensors.
     *
     * ARGUMENTS: sensors - (x, y) positions of sensors [array of 2-arrays of Numbers]
     *            times - times at which respective sensors received the sound signal [array of Numbers, same length as sensors]
     * RETURNS: (x, y) position of the sound source [2-array of Numbers]
     */
    
    // Check that at least four sensors are passed as arguments
    console.assert(sensors.length >= 4);
    console.assert(times.length == sensors.length);
    
    // Caculate differences in radii from radius of first circle
    let delta_r = [];

    for (let i=0; i<4; i++) {
        delta_r.push((times[i] - times[0]) * V_SOUND);
    }

    if (verbose) {
        console.log('Computing differences in radii...');
        console.log('   delta_r:', delta_r);
    }

    // Compute line of intersection for each pair of circles
    let lines = [];

    for (let i=0; i<3; i++) {
        let ctrs = [sensors[i], sensors[i+1]];
        let rs = [delta_r[i], delta_r[i+1]];
        lines.push(lineOfIntersection(ctrs, rs, verbose));
    }

    if (verbose) {
        console.log('Computing lines of intersection...');
        console.log('   lines:', lines);
    }

    // Compute intersection of lines
    let intersect = ptOfIntersection(lines, verbose);

    if (verbose) {
        console.log('Computing intersection of lines...');
        console.log('   intersect:', intersect);
    }

    return intersect;
}

function ptOfIntersetion(lines) {
    this(lines, false);
}

function ptOfIntersection(lines, verbose) {
    /* Computes the intersection of two or more lines.
     *
     * ARGUMENTS: lines - coefficient vector and intercept of each line [array of [n-array, Number], 
     *              where n is the number of dimensions]
     * RETURNS: coordinates of intersection [n-array of Numbers]
     */

    // Build matrix A and intersect vector b
    let A = [];
    let b = [];

    for (let i=0; i<lines.length; i++) {
        A.push(lines[i][0]);
        b.push(lines[i][1]);
    }
    
    let solution = numeric.solve(A, b);
    let pt = solution.slice(0, 2); // solution[2] is distance of sensors[0] from pt

    return pt;
}

function lineOfIntersection(ctrs, delta_r) {
    this(ctrs, delta_r, false);
}

function lineOfIntersection(ctrs, delta_r) {
    /* Computes the line of intersection of two circles.
     *
     * ARGUMENTS: ctrs - centers of the two circles [2-array of 2-arrays of Numbers]
     *            delta_r - difference of radius of each circle from radius of reference circle [2-array of Numbers]
     * RETURNS: coefficient vector and intercept term of the line [array of [3-array, Number]
     */
    
    // Compute coefficient vector
    let a = [];
    a.push(2*ctrs[1][0] - 2*ctrs[0][0]); // Coefficient for x
    a.push(2*ctrs[1][1] - 2*ctrs[0][1]); // Coefficient for y
    a.push(2*delta_r[1] - 2*delta_r[0]); // Coefficient for r (distance between source and sensors[0])

    // Compute intercept
    let b = delta_r[0]**2 - delta_r[1]**2 - ctrs[0][0]**2 - ctrs[0][1]**2 + ctrs[1][0]**2 + ctrs[1][1]**2;

    let line = [a, b];

    return line;
}

function dist(p1, p2) {
    this(p1, p2, false);
}

function dist(p1, p2, verbose) {
    /* Computes the distance between two points
     * 
     * ARGUMENTS: p1, p2 - coordinates of the points [n-arrays, where n is the dimension of the space]
     * RETURNS: distance between points [Number]
     */

    return numeric.norm2(numeric.sub(p2, p1));
}

// Test
let ctrs = [[0, 2], [7, 3], [5, 7], [-3, 18]];
let times = [dist([0,0], ctrs[0])/V_SOUND, dist([0,0], ctrs[1])/V_SOUND, dist([0,0], ctrs[2])/V_SOUND, dist([0,0], ctrs[3])/V_SOUND];

console.log(ctrs);
console.log(pinpoint(ctrs, times, true));
