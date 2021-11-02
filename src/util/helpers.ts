import { Vector as VectorLayer } from 'ol/layer';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Polygon from 'ol/geom/Polygon';
import { Style, Fill } from 'ol/style';
import { Frame, GeoJSON, FeatureGeojson } from '../types';

const percentageToHsl = (percentage: number) => {
  const hue = percentage * -120 + 120;
  return 'hsla(' + hue + ', 100%, 50%, 0.3)';
};

const createPolygon = (feature: FeatureGeojson, value: string, color: string) => {
  let coordinates: number[][][] = [];

  if (feature.geometry.type == 'Polygon') {
    coordinates = feature.geometry.coordinates;
  } else if (feature.geometry.type == 'LineString') {
    coordinates = [feature.geometry.coordinates];
  }

  const polygonFeature = new Feature<Polygon>({
    type: 'Polygon',
    geometry: new Polygon(coordinates).transform('EPSG:4326', 'EPSG:3857'),
  });

  polygonFeature.set('value', value);
  polygonFeature.set('color', color);
  polygonFeature.setStyle(
    new Style({
      fill: new Fill({
        color: color,
      }),
    })
  );

  return polygonFeature;
};

export const processData = (series: Frame[]) => {
  const perID: { [key: string]: { [key: string]: number } } = {};

  series.map(item => {
    const value = item.fields[0].values.buffer.slice(-1)[0] || 0;
    if (!item.name) return;

    const [hash, polygon_id] = item.name.split(' ');

    if (!perID[hash]) perID[hash] = {};

    perID[hash][polygon_id] = value;
  });

  return perID;
};

export const createHeatLayer = (byID: { [key: string]: number }, geojson: GeoJSON) => {
  const byIdLog: { [key: string]: number } = {};

  Object.keys(byID).map(polygon_id => {
    byIdLog[polygon_id] = Math.log(byID[polygon_id] + 1);
  });

  const heatValues = Object.values(byIdLog);
  const max = Math.max(...heatValues);
  // const min = Math.min(...heatValues);
  // const range = max - min;

  const polygons: Feature<Polygon>[] = [];
  geojson.features.map(feature => {
    if (feature.properties && feature.properties.name) {
      const valueLabel = byID[feature.properties.name] || 0;
      let percentage = 0;
      if (byIdLog[feature.properties.name] && max != 0) percentage = (byIdLog[feature.properties.name] - 0) / max;

      polygons.push(createPolygon(feature, valueLabel.toString(), percentageToHsl(percentage)));
    }
  });

  return new VectorLayer({
    source: new VectorSource({
      features: polygons,
    }),
    zIndex: 2,
  });
};
