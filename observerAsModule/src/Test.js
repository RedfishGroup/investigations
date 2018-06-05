import React, { Component } from "react";

import * as THREE from "three";
import { HeadsUpDisplay } from "../node_modules/earthruntime/src/camera/HUD/HeadsUpDisplay.js";
import { LAYER_CHANGE_EVENT } from "../node_modules/earthruntime/src/camera/HUD/HUDLayers.js";
import { HUDLayerGeoJson } from "../node_modules/earthruntime/src/camera/HUD/HUDLayerGeoJson.js";
import { HUDLayerHorizon } from "../node_modules/earthruntime/src/camera/HUD/HUDLayerHorizon.js";
import { HUDLayerEcliptic } from "../node_modules/earthruntime/src/camera/HUD/HUDLayerEcliptic.js";
import { HUDPeers } from "../node_modules/earthruntime/src/camera/HUD/HUDPeers.js";
import { HUDSettings } from "../node_modules/earthruntime/src/camera/components/HUDSettings.js";
import { OrbitControls } from "../node_modules/earthruntime/src/geo/threeObjects/orbitControls.js"; // 'Observer/src/threeObjects/orbitControls.js'
import { TrackballControls } from "../node_modules/earthruntime/src/geo/threeObjects/TrackballControls.js"; // 'Observer/src/threeObjects/orbitControls.js'
import { geoJson2THREE } from "../node_modules/earthruntime/src/camera/geoJson2THREE.js";
// straight out of app.js
import { connect } from "react-redux";
import "react-toggle/style.css";
import "../node_modules/earthruntime/src/App.css";
import { CameraPage } from "../node_modules/earthruntime/src/camera/components/CameraPage.js";
import VideoDisplay from "../node_modules/earthruntime/src/camera/components/VideoDisplay.js";
import {
  cameraInit,
  setMyVid
} from "../node_modules/earthruntime/src/camera/redux/actions.js";
import { setFullscreenEnabled } from "../node_modules/earthruntime/src/redux/actions/index.js";
import { NotFound } from "../node_modules/earthruntime/src/components/NotFound.js";
import { MapPage } from "../node_modules/earthruntime/src/geo/components/MapPage.js";
import "../node_modules/earthruntime/src/index.css";
import {
  storePhotoAction,
  storeVideoAction
} from "../node_modules/earthruntime/src/media/redux/actions.js";
import OnlineInformation from "../node_modules/earthruntime/src/net/components/OnlineInformation.js";
import { PeersListPage } from "../node_modules/earthruntime/src/net/components/PeersListPage.js";
import { initApp } from "../node_modules/earthruntime/src/redux/actions/appActions.js";
import "../node_modules/earthruntime/src/geo/layerStore.js";
import "babel-polyfill";

class HeadsUpDisplayTest extends Component {
  componentDidMount() {
    console.log("THREE", THREE);
    this.controls = undefined;
    this.renderer = undefined;
    this.scene = undefined;
    this.camera = undefined;
    this.controls = undefined;

    this.headup = new HeadsUpDisplay(this.refs.can, THREE, true);
    this.headup.ori.start();

    // this._getGlobeTestJson()
    this._testLocalGJ();
    this._addEcliptic();
    this._addPeers();
    this.testGeoJson2Three();
  }

  _addEcliptic() {
    //
    let eclip = new HUDLayerEcliptic();
    this.headup.addLayer(eclip, true);
    eclip.setVisible(true);
    //
    let hor = new HUDLayerHorizon();
    this.headup.addLayer(hor);
    hor.setVisible(true);
  }

  _addPeers() {
    let peers = new HUDPeers();
    window.peerLay = peers;
    this.headup.addLayer(peers);
    peers.setVisible(true);
  }

  _testLocalGJ() {
    let lay = new HUDLayerGeoJson({ name: "Local GeoJSON" });
    lay.update(testPointsAt00);
    this.headup.addLayer(lay);
    lay.setVisible(true);
  }

  _getGlobeTestJson() {
    let lay = new HUDLayerGeoJson({ name: "World GeoJSON" });
    lay.loadUrl(
      "https://www.livetexture.com/demos/HeadsUpDisplayTestGlobe.json"
    );
    this.headup.addLayer(lay);
    lay.setVisible(true);
  }

  getLayersJSX() {
    if (!this.headup) {
      return <div> Not ready </div>;
    }
    var i = 0;
    var layersJSX = <HUDSettings hudRef={this.headup} />;

    return <div>{layersJSX}</div>;
  }

  _loadUrl(url) {
    return new Promise((resolve, reject) => {
      //let url = 'https://www.livetexture.com/demos/HeadsUpDisplayTestGlobe.json'
      var oReq = new XMLHttpRequest();
      oReq.addEventListener("load", ev => {
        console.log("geojson: im loaded");
        let fu = JSON.parse(ev.target.responseText);
        resolve(fu);
        //this.update(fu)
      });
      oReq.addEventListener("error", ev => {
        console.warn("error loading", url, ev);
        reject(ev);
      });
      oReq.open("GET", url);
      oReq.send();
    });
  }

  async testGeoJson2Three() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.0001, 1000);
    //New Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.refs.can2 });
    this.renderer.setSize(400, 400);
    var planet = new THREE.Object3D();
    //Create a sphere to make visualization easier.
    var geometry = new THREE.SphereGeometry(0.95, 16, 16);
    var material = new THREE.MeshBasicMaterial({
      color: 0x333333,
      wireframe: true
      //transparent: true,
    });
    var sphere = new THREE.Mesh(geometry, material);
    planet.add(sphere);
    this.scene.add(planet);
    //Set the camera position
    this.camera.position.set(2, 0, 0);
    this.camera.up.set(0, 0, 1);
    this.camera.updateMatrix();
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    //Enable controls
    this.controls = new TrackballControls(this.camera, this.refs.can2);
    this.controls.maxDistance = 40;
    this.controls.minDistance = 0;
    this.controls.zoomSpeed = 0.005;
    this.controls.rotateSpeed = 0.1;
    this.controls.maxPolarAngle = 0;
    this.controls.enablePan = true;
    this.controls.enableKeys = false;
    this.renderGeothree();
    var gj = await this._loadUrl(
      "https://www.livetexture.com/demos/HeadsUpDisplayTestGlobe.json"
    );
    console.log(gj);
    var grp = geoJson2THREE(gj);
    this.scene.add(grp);

    var grp2 = geoJson2THREE(testPointsAt00);
    this.scene.add(grp2);
    // get something to test
  }
  //Render the image
  renderGeothree() {
    this.controls.update(1);
    requestAnimationFrame(this.renderGeothree.bind(this));
    this.renderer.render(this.scene, this.camera);
  }

  render() {
    return (
      <div>
        <CameraPage
          onConnection={() => {
            this.newWebRTCConnection();
          }}
          webrtcServer={this.props.webrtcServer}
          VideoDisplay={this.myvid}
          hudRef={this.hudRef}
        />
        {this.getLayersJSX()}
        <canvas
          style={{
            padding: "10px",
            margin: "10px",
            border: "thick double #ab3a3a"
          }}
          id="can"
          ref="can"
          width="400"
          height="400"
        />
        <br />
        <canvas
          style={{
            padding: "10px",
            margin: "10px",
            border: "thick double #32a1ce"
          }}
          id="can2"
          ref="can2"
          width="400"
          height="400"
        />
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    webrtcServer: state.net && state.net.webrtcServer,
    cameraIsReady: state.camera && state.camera.cameraIsReady,
    myvid: state.camera && state.camera.myvid,
    camera: state.camera && state.camera.camera,
    cameraIsIniting: state.camera && state.camera.cameraIsIniting
  };
}

function mapDispatchToProps(dispatch) {
  return {
    initApp: () => dispatch(initApp()),
    storePhoto: photoObj => dispatch(storePhotoAction(photoObj)),
    storeVideo: (videoObj, videoElem) =>
      dispatch(storeVideoAction(videoObj, videoElem)),
    cameraInit: (storePhoto, storeVideo, myvid) =>
      dispatch(cameraInit(storePhoto, storeVideo, myvid)),
    setMyVid: myvid => dispatch(setMyVid(myvid))
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(HeadsUpDisplayTest);

var testPointsAt00 = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        "marker-color": "#daa100",
        "marker-size": "medium",
        "marker-symbol": "",
        title: "Floating Avacado Tree(Live)"
      },
      geometry: {
        type: "Point",
        coordinates: [-7.690429687499999, 0.9228116626857066]
      }
    },
    {
      type: "Feature",
      properties: {
        stroke: "#00d200",
        "stroke-width": 2,
        "stroke-opacity": 1,
        fill: "#cb5000",
        "fill-opacity": 0.5
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-2.5927734375, 1.4500404973608074],
            [-2.724609375, -0.4833927027896987],
            [-0.0439453125, -1.0546279422758742],
            [3.9990234375, -0.3515602939922709],
            [3.33984375, 1.2743089918452106],
            [2.373046875, 2.152813583128846],
            [2.9443359375, 2.8991526985043135],
            [3.69140625, 3.7327083213358465],
            [2.7685546874999996, 4.434044005032582],
            [2.2412109375, 3.9519408561575946],
            [1.845703125, 2.943040910055132],
            [1.5380859375, 1.8893059628373186],
            [1.0546875, 1.4939713066293239],
            [0.1318359375, 1.4500404973608074],
            [-0.1318359375, 1.7575368113083254],
            [-0.087890625, 2.5479878714713835],
            [-0.087890625, 3.030812122664383],
            [-0.3515625, 3.118576216781991],
            [-1.23046875, 2.6357885741666065],
            [-1.318359375, 2.064982495867117],
            [-1.318359375, 1.4500404973608074],
            [-1.7138671875, 0.8788717828324276],
            [-2.109375, 1.8893059628373186],
            [-2.5927734375, 1.4500404973608074]
          ]
        ]
      }
    },
    {
      type: "Feature",
      properties: {
        stroke: "#940000",
        "stroke-width": 2,
        "stroke-opacity": 1
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [-12.919921874999998, -2.85526278436657],
          [-0.1318359375, -3.425691524418062],
          [4.7900390625, -2.3723687086440504],
          [7.163085937499999, 0.7909904981540058],
          [8.3935546875, -4.390228926463384]
        ]
      }
    },
    {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-5.625, -7.623886853120036],
            [-2.021484375, -7.623886853120036],
            [-2.021484375, -4.740675384778361],
            [-5.625, -4.740675384778361],
            [-5.625, -7.623886853120036]
          ]
        ]
      }
    },
    {
      type: "Feature",
      properties: {
        "marker-color": "#da00aa",
        "marker-size": "medium",
        "marker-symbol": "rocket",
        title: "Ancient ship wreck"
      },
      geometry: {
        type: "Point",
        coordinates: [-10.107421874999998, -1.2743089918452106]
      }
    },
    {
      type: "Feature",
      properties: {
        "marker-color": "#da00aa",
        "marker-size": "medium",
        "marker-symbol": "rocket",
        title: "👾👾Lost city Of Atalantis👾👾"
      },
      geometry: {
        type: "Point",
        coordinates: [-106.47674560546875, 35.29719384502174]
      }
    },
    {
      type: "Feature",
      properties: {
        "marker-color": "#da00aa",
        "marker-size": "medium"
      },
      geometry: {
        type: "Point",
        coordinates: [-106.57674560546875, 35.19719384502174, 3000]
      }
    },
    {
      type: "Feature",
      properties: {
        stroke: "#53f6ff",
        "stroke-width": 2,
        "stroke-opacity": 1
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [-106.41700744628906, 35.08901242683384, 2000],
          [-106.43142700195311, 35.09406896086629, 2000],
          [-106.43142700195311, 35.11934692745627, 2000],
          [-106.42250061035156, 35.132825303652396, 2000],
          [-106.41426086425781, 35.15107371562544, 2000],
          [-106.41563415527342, 35.16931803601131, 2000],
          [-106.41460418701172, 35.17436958581184, 2000],
          [-106.42181396484375, 35.184752341389654, 2000],
          [-106.44241333007812, 35.19737822958456, 2000],
          [-106.4520263671875, 35.20663596719818, 2000],
          [-106.45305633544922, 35.22963547294416, 2000],
          [-106.45477294921874, 35.24281517795507, 2000],
          [-106.45477294921874, 35.24702101597432, 2000]
        ]
      }
    },
    {
      type: "Feature",
      properties: {
        stroke: "#555555",
        "stroke-width": 2,
        "stroke-opacity": 1,
        fill: "#71deac",
        "fill-opacity": 0.5
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-109.6875, 60.930432202923335, 8200000],
            [-113.90625, 46.31658418182218, 8200000],
            [-146.95312499999997, 45.82879925192134, 8200000],
            [-124.8046875, 34.88593094075317, 8200000],
            [-129.375, 21.616579336740603, 8200000],
            [-111.09374999999999, 32.24997445586331, 8200000],
            [-88.59374999999999, 16.29905101458183, 8200000],
            [-98.7890625, 40.17887331434696, 8200000],
            [-64.6875, 48.922499263758255, 8200000],
            [-103.35937499999999, 47.517200697839414, 8200000],
            [-109.6875, 60.930432202923335, 8200000]
          ]
        ]
      }
    }
  ]
};
