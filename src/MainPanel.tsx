import React, { PureComponent } from 'react';
import { PanelProps } from '@grafana/data';
import { PanelOptions, Frame } from 'types';
import { Map, View } from 'ol';
import XYZ from 'ol/source/XYZ';
import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer';
import { fromLonLat } from 'ol/proj';
import { defaults, DragPan, MouseWheelZoom } from 'ol/interaction';
import { platformModifierKeyOnly } from 'ol/events/condition';
import Select from 'ol/interaction/Select';
import { Style, Text, Stroke, Fill } from 'ol/style';
import { pointerMove } from 'ol/events/condition';
import { nanoid } from 'nanoid';
import { processData, createHeatLayer } from './util/helpers';
import 'ol/ol.css';

interface Props extends PanelProps<PanelOptions> {}
interface State {
  options: string[];
  current: string;
}

export class MainPanel extends PureComponent<Props, State> {
  id = 'id' + nanoid();
  map: Map;
  randomTile: TileLayer;
  heatLayer: VectorLayer;
  perID: { [key: string]: { [key: string]: number } };

  state: State = {
    options: ['None'],
    current: 'None',
  };

  componentDidMount() {
    const { tile_url, zoom_level, center_lon, center_lat } = this.props.options;

    const carto = new TileLayer({
      source: new XYZ({
        url: 'https://{1-4}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      }),
    });

    this.map = new Map({
      interactions: defaults({ dragPan: false, mouseWheelZoom: false, onFocusOnly: true }).extend([
        new DragPan({
          condition: function(event) {
            return platformModifierKeyOnly(event) || this.getPointerCount() === 2;
          },
        }),
        new MouseWheelZoom({
          condition: platformModifierKeyOnly,
        }),
      ]),
      layers: [carto],
      view: new View({
        center: fromLonLat([center_lon, center_lat]),
        zoom: zoom_level,
      }),
      target: this.id,
    });

    if (tile_url !== '') {
      this.randomTile = new TileLayer({
        source: new XYZ({
          url: tile_url,
        }),
        zIndex: 1,
      });
      this.map.addLayer(this.randomTile);
    }

    if (this.props.data.series.length > 0 && this.props.options.geojson) {
      this.perID = processData(this.props.data.series as Frame[]);
      const list = Object.keys(this.perID).sort(
        (a, b) => Object.keys(this.perID[b]).length - Object.keys(this.perID[a]).length
      );
      this.setState({ options: list });
    }

    const hoverInteraction = new Select({
      condition: pointerMove,
      style: function(feature) {
        const style: { [key: string]: any[] } = {};
        const geometry_type = feature.getGeometry()?.getType();

        style['Polygon'] = [
          new Style({
            fill: new Fill({
              color: feature.get('color'),
            }),
          }),
          new Style({
            text: new Text({
              stroke: new Stroke({
                color: '#fff',
                width: 2,
              }),
              font: '18px Calibri,sans-serif',
              text: feature.get('value'),
              overflow: true,
            }),
          }),
        ];

        return style[geometry_type || ''];
      },
    });
    this.map.addInteraction(hoverInteraction);
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (prevProps.data.series !== this.props.data.series) {
      this.map.removeLayer(this.heatLayer);
      if (!this.props.options.geojson) return;

      this.perID = processData(this.props.data.series as Frame[]);

      const list = Object.keys(this.perID).sort(
        (a, b) => Object.keys(this.perID[b]).length - Object.keys(this.perID[a]).length
      );

      if (this.state.current == 'None') {
        this.setState({ options: list });
        return;
      }

      if (!this.perID[this.state.current]) {
        this.setState({ options: list, current: 'None' });
        return;
      }

      this.heatLayer = createHeatLayer(this.perID[this.state.current], this.props.options.geojson);
      this.map.addLayer(this.heatLayer);
    }

    if (prevState.current !== this.state.current) {
      this.map.removeLayer(this.heatLayer);
      if (!this.props.options.geojson || this.state.current == 'None') return;

      this.heatLayer = createHeatLayer(this.perID[this.state.current], this.props.options.geojson);
      this.map.addLayer(this.heatLayer);
    }

    if (prevProps.options.tile_url !== this.props.options.tile_url) {
      if (this.randomTile) this.map.removeLayer(this.randomTile);

      if (this.props.options.tile_url !== '') {
        this.randomTile = new TileLayer({
          source: new XYZ({
            url: this.props.options.tile_url,
          }),
          zIndex: 1,
        });
        this.map.addLayer(this.randomTile);
      }
    }

    if (prevProps.options.zoom_level !== this.props.options.zoom_level)
      this.map.getView().setZoom(this.props.options.zoom_level);

    if (
      prevProps.options.center_lat !== this.props.options.center_lat ||
      prevProps.options.center_lon !== this.props.options.center_lon
    )
      this.map.getView().animate({
        center: fromLonLat([this.props.options.center_lon, this.props.options.center_lat]),
        duration: 2000,
      });
  }

  onSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    this.setState({ current: e.target.value });
  };

  render() {
    const { width, height } = this.props;
    const { options, current } = this.state;

    return (
      <div style={{ width, height }}>
        <select id="selector" style={{ width: 250 }} onChange={this.onSelect} value={current}>
          <option>None</option>
          {options.map(item => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <div id={this.id} style={{ width, height: height - 40 }}></div>
      </div>
    );
  }
}
