import * as THREE from "three";

import { ecef_lla, lla_ecef, a } from "./ECEF.js";

export class GlobeReference {
  constructor(options = {}) {
    this.Latitude = options.Latitude || 35;
    this.Longitude = options.Longitude || -106;
    this.Elevation = options.Elevation || 0;
    this.zoom = options.zoom || 10;

    this.scalingFactor = (100 * this.zoom) / a;

    this.object3D = new THREE.Object3D();

    this._updateMatrix();
  }

  setZoom(zoom) {
    this.zoom = zoom;
    this.scalingFactor = this.zoom / a;
    this._updateMatrix();
  }

  setCenter(Latitude, Longitude, Elevation) {
    this.Latitude = Latitude;
    this.Longitude = Longitude;
    this.Elevation = Elevation;
    this._updateMatrix();
  }

  setCenterAndZoom(Latitude, Longitude, Elevation, zoom) {
    this.Latitude = Latitude;
    this.Longitude = Longitude;
    this.Elevation = Elevation;
    this.zoom = zoom;
    this._updateMatrix();
  }

  _updateMatrix() {
    // set scale
    this.object3D.scale.set(
      this.scalingFactor,
      this.scalingFactor,
      this.scalingFactor
    );

    // rotate up to lat = 90 degrees, rotate around to lon = 0 degrees
    // create rotational matrix
    let lat = this.Latitude;
    let lon = this.Longitude;
    let elev = this.Elevation;
    this.object3D.rotation.set(
      0,
      (lat - 90.0) * (Math.PI / 180.0),
      -lon * (Math.PI / 180.0)
    );

    // get the untransformed center of the mesh and apply the rotation,
    // then set translate to put the mesh at the origin
    let [x, y, z] = lla_ecef(lat, lon, elev);

    let center = new THREE.Vector3(x, y, z).multiplyScalar(this.scalingFactor);
    center.applyEuler(this.object3D.rotation).multiplyScalar(-1);

    this.object3D.position.set(center.x, center.y, center.z);

    // update matrix to reflect scale, rotation, and position
    this.object3D.updateMatrix();

    // necessary for computing real Latitude, Longitude, Elevation
    this.object3D.inverseMatrix = new THREE.Matrix4().invert(
      this.object3D.matrix
    );
  }

  getMatrix() {
    return this.object3D.matrix.clone();
  }
}
