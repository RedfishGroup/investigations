////////////////////////////////////////////////////////
/*  ECEF  */
// Author: Emma Gould

// Description:
// Conversion functions for going back and forth
// between lat, long, altitude/elevation coordinates
// and cartesian earth-centered, earth-fixed coordinates
// assuming ellipsoid model acting as sea-level, units
// are in meters
////////////////////////////////////////////////////////

// in meters
export const a = 6378137.0;
const f = 1.0 / 298.257223563;
const b = a * (1.0 - f);
const e = Math.sqrt((a * a - b * b) / (a * a));
const e_prime = Math.sqrt((a * a - b * b) / (b * b));

// assumes angle is in degrees and returns correct sine
function sinD(angle) {
  return Math.sin(angle * (Math.PI / 180.0));
}

// assumes angle is in degrees and returns correct cosine
function cosD(angle) {
  return Math.cos(angle * (Math.PI / 180.0));
}

// returns angle in degrees
function atanD(value) {
  return Math.atan(value) * (180.0 / Math.PI);
}

// given lat, long, and elevation/height, returns x, y, z
export function lla_ecef(lat, long, h) {
  if (long > 180.0) long -= 360.0;
  if (long < -180.0) long += 360.0;

  if (lat > 90.0) lat -= 180.0;
  if (lat < -90.0) lat += 180.0;

  // if h is not included, return height of ellipsoid
  if (h === undefined) {
    h = 0.0;
  }
  // calculate radius of curvature
  let N = a / Math.sqrt(1.0 - e * e * sinD(lat) * sinD(lat));

  let x = (N + h) * cosD(lat) * cosD(long);
  let y = (N + h) * cosD(lat) * sinD(long);
  let z = (((b * b) / (a * a)) * N + h) * sinD(lat);

  return [x, y, z];
}

export function ecef_lla(x, y, z) {
  let p = Math.sqrt(x * x + y * y);
  let theta = atanD((z * a) / (p * b));

  let lat = atanD(
    (z + e_prime * e_prime * b * sinD(theta) * sinD(theta) * sinD(theta)) /
      (p - e * e * a * cosD(theta) * cosD(theta) * cosD(theta))
  );
  let long = atanD(y / x);

  // calculate radius of curvature with respect to lat, long that has been calculated
  let N = a / Math.sqrt(1.0 - e * e * sinD(lat) * sinD(lat));
  let h = p / cosD(lat) - N;

  if (x < 0 && y < 0) long -= 180.0;
  if (x < 0 && y > 0) long += 180.0;

  return [lat, long, h];
}
