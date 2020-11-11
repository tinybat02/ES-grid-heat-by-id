import { DataFrame, Field, Vector } from '@grafana/data';

export interface FeatureGeojson {
  type: string;
  properties: {
    [key: string]: string;
    id: string;
  };
  geometry:
    | {
        type: 'Polygon';
        coordinates: number[][][];
      }
    | {
        type: 'LineString';
        coordinates: number[][];
      };
}

export interface GeoJSON {
  features: Array<FeatureGeojson>;
}

export interface PanelOptions {
  center_lat: number;
  center_lon: number;
  tile_url: string;
  zoom_level: number;
  geojson: GeoJSON | null;
}

export const defaults: PanelOptions = {
  center_lat: 48.1239,
  center_lon: 11.60857,
  tile_url: '',
  zoom_level: 18,
  geojson: null,
};

export interface Buffer extends Vector {
  buffer: number[];
}

export interface FieldBuffer extends Field<any, Vector> {
  values: Buffer;
}

export interface Frame extends DataFrame {
  fields: FieldBuffer[];
}
