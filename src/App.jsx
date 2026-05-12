import { useEffect, useRef, useCallback, useState } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import ControlPanel from "./ControlPanel";
import { createPinSvg } from "../public/utils/createPinSvg.js";
import { DEFAULT_MODEL_URI } from "./components/tabs/object/ObjectModelSelect.jsx";

const CESIUM_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyYTRjOTgxOS0wYzIwLTRlOGQtYTk1MS0yOTkzOTJkOWI4MDQiLCJpZCI6NDE2MzQ4LCJzdWIiOiJIdXloaCIsImlzcyI6Imh0dHBzOi8vaW9uLmNlc2l1bS5jb20iLCJhdWQiOiJIdXloaF9kZWZhdWx0IiwiaWF0IjoxNzc3NzE2OTM3fQ.BmbSAqkdxzHMo56qnkA8H69oJTVyiML0fuIy5MRF0F4";

const LABEL_STYLE = (name) => ({
  text: name,
  font: "14px Courier New",
  fillColor: Cesium.Color.fromCssColorString("#00ff88"),
  outlineColor: Cesium.Color.BLACK,
  outlineWidth: 2,
  style: Cesium.LabelStyle.FILL_AND_OUTLINE,
  verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
  pixelOffset: new Cesium.Cartesian2(0, -20),
  disableDepthTestDistance: Number.POSITIVE_INFINITY,
});

export default function App() {
  const cesiumRef = useRef({
    viewer: null,
    objects: new Map(),
    simInterval: null,
    highlightEntity: null,
  });

  const onDoubleClickRef = useRef(null);
  const [pickedPos, setPickedPos] = useState(null);

  useEffect(() => {
    Cesium.Ion.defaultAccessToken = CESIUM_TOKEN;

    const initViewer = async () => {
      const viewer = new Cesium.Viewer("cesium-container", {
        terrainProvider: await Cesium.createWorldTerrainAsync(),
        timeline: false,
        animation: false,
        sceneMode: Cesium.SceneMode.SCENE3D,
        scene3DOnly: true,
      });

      cesiumRef.current.viewer = viewer;

      viewer.scene.globe.depthTestAgainstTerrain = true;
      viewer.scene.globe.enableLighting = true;
      viewer.scene.msaaSamples = 4;

      const buildingTileset = await Cesium.createOsmBuildingsAsync({
        style: new Cesium.Cesium3DTileStyle({
          color: {
            conditions: [
              [
                "${feature['cesium#estimatedHeight']} >= 150",
                "color('#FF0000')",
              ],
              [
                "${feature['cesium#estimatedHeight']} >= 100",
                "color('#FF4500')",
              ],
              [
                "${feature['cesium#estimatedHeight']} >= 75",
                "color('#FF8C00')",
              ],
              [
                "${feature['cesium#estimatedHeight']} >= 50",
                "color('#FFA500')",
              ],
              [
                "${feature['cesium#estimatedHeight']} >= 25",
                "color('#FFD700')",
              ],
              [
                "${feature['cesium#estimatedHeight']} >= 10",
                "color('#ADFF2F')",
              ],
              ["true", "color('#00FF7F')"],
            ],
          },
        }),
      });

      viewer.scene.primitives.add(buildingTileset);
      viewer.scene.postRender.addEventListener(() => {
        buildingTileset.show = viewer.camera.pitch > -0.8;
      });

      // ── DOUBLE CLICK ─────────────────────────────────────
      viewer.screenSpaceEventHandler.setInputAction((click) => {
        const cartesian = viewer.camera.pickEllipsoid(click.position);
        if (!cartesian) return;
        const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
        const lon = Cesium.Math.toDegrees(cartographic.longitude).toFixed(6);
        const lat = Cesium.Math.toDegrees(cartographic.latitude).toFixed(6);
        onDoubleClickRef.current?.({ lat, lon });
      }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(105.798641, 20.990979, 295),
        orientation: {
          heading: Cesium.Math.toRadians(52.5),
          pitch: Cesium.Math.toRadians(-32.2),
          roll: 0,
        },
        duration: 2,
      });

      return viewer;
    };

    const viewerPromise = initViewer();
    return () => {
      viewerPromise.then((v) => {
        cesiumRef.current.viewer = null;
        cesiumRef.current.objects.clear();
        v.destroy();
      });
    };
  }, []);

  // Gán callback double click
  onDoubleClickRef.current = ({ lat, lon }) => {
    setPickedPos({ lat, lon });
    handleHighlight({ lat, lon });
  };

  const handleFly = useCallback(({ lat, lon, alt, heading, pitch }) => {
    const { viewer } = cesiumRef.current;
    if (!viewer) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        parseFloat(lon),
        parseFloat(lat),
        parseFloat(alt),
      ),
      orientation: {
        heading: Cesium.Math.toRadians(parseFloat(heading)),
        pitch: Cesium.Math.toRadians(parseFloat(pitch)),
        roll: 0,
      },
      duration: 2,
    });
  }, []);

  const handleHighlight = useCallback(({ lat, lon, name }) => {
    const { viewer } = cesiumRef.current;
    if (!viewer) return;

    if (cesiumRef.current.highlightEntity) {
      viewer.entities.remove(cesiumRef.current.highlightEntity);
    }

    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(
        parseFloat(lon),
        parseFloat(lat),
        0,
      ),
      billboard: {
        image: createPinSvg(),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scale: 1.0,
      },
      label: {
        text:
          name ||
          `${parseFloat(lat).toFixed(5)}, ${parseFloat(lon).toFixed(5)}`,
        font: "12px Courier New",
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -52),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        showBackground: true,
        backgroundColor:
          Cesium.Color.fromCssColorString("#1a1a2e").withAlpha(0.85),
        backgroundPadding: new Cesium.Cartesian2(8, 4),
      },
    });

    cesiumRef.current.highlightEntity = entity;
  }, []);

  // ── OBJECT HANDLERS ──────────────────────────────────────

  const handleAddObject = useCallback(
    ({ id, name, lat, lon, alt, modelUri }) => {
      const { viewer } = cesiumRef.current;
      if (!viewer) return;
      const entity = viewer.entities.add({
        id,
        name,
        position: Cesium.Cartesian3.fromDegrees(
          parseFloat(lon),
          parseFloat(lat),
          parseFloat(alt),
        ),
        model: {
          uri: modelUri || DEFAULT_MODEL_URI,
          minimumPixelSize: 64,
          maximumScale: 5000,
          scale: 20.0,
        },
        label: LABEL_STYLE(name),
      });
      cesiumRef.current.objects.set(id, { entity });
    },
    [],
  );

  const handleRemoveObject = useCallback((id) => {
    const { viewer } = cesiumRef.current;
    if (!viewer) return;
    const obj = cesiumRef.current.objects.get(id);
    if (obj) {
      viewer.entities.remove(obj.entity);
      cesiumRef.current.objects.delete(id);
    }
  }, []);

  const handleMoveObject = useCallback(({ id, lat, lon, alt }) => {
    const obj = cesiumRef.current.objects.get(id);
    if (!obj) return;
    obj.entity.position = Cesium.Cartesian3.fromDegrees(
      parseFloat(lon),
      parseFloat(lat),
      parseFloat(alt),
    );
  }, []);

  const handleTrackObject = useCallback((id) => {
    const { viewer } = cesiumRef.current;
    const obj = cesiumRef.current.objects.get(id);
    if (!viewer || !obj) return;
    viewer.zoomTo(
      obj.entity,
      new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(52.5),
        Cesium.Math.toRadians(-32.2),
        500,
      ),
    );
  }, []);

  const handleRotateObject = useCallback(({ id, heading, pitch, roll }) => {
    const obj = cesiumRef.current.objects.get(id);
    if (!obj) return;
    const position = obj.entity.position.getValue(Cesium.JulianDate.now());
    if (!position) return;
    obj.entity.orientation = Cesium.Transforms.headingPitchRollQuaternion(
      position,
      new Cesium.HeadingPitchRoll(
        Cesium.Math.toRadians(parseFloat(heading)),
        Cesium.Math.toRadians(parseFloat(pitch)),
        Cesium.Math.toRadians(parseFloat(roll)),
      ),
    );
  }, []);

  // ── SIMULATE ─────────────────────────────────────────────

  const handleSimulate = useCallback(({ id, path }) => {
    const { viewer } = cesiumRef.current;
    const obj = cesiumRef.current.objects.get(id);
    if (!viewer || !obj) return;

    viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights(
          path.flatMap((p) => [p.lon, p.lat, p.alt]),
        ),
        width: 2,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.2,
          color: Cesium.Color.fromCssColorString("#00ffcc"),
        }),
        clampToGround: false,
      },
    });

    let index = 0;
    const interval = setInterval(() => {
      if (index >= path.length) {
        clearInterval(interval);
        return;
      }
      const { lat, lon, alt, heading, pitch } = path[index];
      obj.entity.position = Cesium.Cartesian3.fromDegrees(
        parseFloat(lon),
        parseFloat(lat),
        parseFloat(alt),
      );
      const position = obj.entity.position.getValue(Cesium.JulianDate.now());
      if (position) {
        obj.entity.orientation = Cesium.Transforms.headingPitchRollQuaternion(
          position,
          new Cesium.HeadingPitchRoll(
            Cesium.Math.toRadians(parseFloat(heading || 0)),
            Cesium.Math.toRadians(parseFloat(pitch || 0)),
            0,
          ),
        );
      }
      index++;
    }, 1000);

    cesiumRef.current.simInterval = interval;
  }, []);

  const handleStopSimulate = useCallback(() => {
    if (cesiumRef.current.simInterval) {
      clearInterval(cesiumRef.current.simInterval);
      cesiumRef.current.simInterval = null;
    }
  }, []);

  const handleRenameObject = useCallback(({ id, name }) => {
    const obj = cesiumRef.current.objects.get(id);
    if (!obj) return;
    obj.entity.label.text = name;
    obj.entity.name = name;
  }, []);

  const handleChangeModel = useCallback(({ id, modelUri }) => {
    const obj = cesiumRef.current.objects.get(id);
    if (!obj) return;
    obj.entity.model.uri = modelUri;
  }, []);

  const handleDrawPath = useCallback((path, objectId) => {
    const { viewer } = cesiumRef.current;
    if (!viewer) return;

    // Xóa polyline cũ của object này nếu có
    if (cesiumRef.current.pathEntities) {
      const old = cesiumRef.current.pathEntities.get(objectId);
      if (old) viewer.entities.remove(old);
    } else {
      cesiumRef.current.pathEntities = new Map();
    }

    const entity = viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights(
          path.flatMap((p) => [p.lon, p.lat, p.alt]),
        ),
        width: 2,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.2,
          color: Cesium.Color.fromCssColorString("#00ffcc"),
        }),
        clampToGround: false,
      },
    });

    cesiumRef.current.pathEntities.set(objectId, entity);
  }, []);

  const handleClearPath = useCallback((objectId) => {
    const { viewer } = cesiumRef.current;
    if (!viewer || !cesiumRef.current.pathEntities) return;
    const entity = cesiumRef.current.pathEntities.get(objectId);
    if (entity) {
      viewer.entities.remove(entity);
      cesiumRef.current.pathEntities.delete(objectId);
    }
  }, []);

  return (
    <>
      <div
        id="cesium-container"
        style={{
          width: "100vw",
          height: "100vh",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />
      <ControlPanel
        onFly={handleFly}
        onHighlight={handleHighlight}
        onAddObject={handleAddObject}
        onRemoveObject={handleRemoveObject}
        onMoveObject={handleMoveObject}
        onTrackObject={handleTrackObject}
        onRotateObject={handleRotateObject}
        onSimulate={handleSimulate}
        onStopSimulate={handleStopSimulate}
        pickedPos={pickedPos}
        onRenameObject={handleRenameObject}
        onChangeModel={handleChangeModel}
        onDrawPath={handleDrawPath}
        onClearPath={handleClearPath}
      />
    </>
  );
}
