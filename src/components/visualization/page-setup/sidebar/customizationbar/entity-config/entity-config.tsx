import { Tab, Tabs } from 'react-bootstrap';
import BuildingConfig from './buildings/building-config';
import CityConfig from './cities/city-config';
import DistrictConfig from './districts/district-config';

export default function EntityConfig() {
  return (
    <Tabs defaultActiveKey="buildings">
      <Tab
        eventKey="buildings"
        title="Buildings"
        className="border border-top-0 p-3"
        tabClassName="text-dark"
      >
        <BuildingConfig />
      </Tab>
      <Tab
        eventKey="districts"
        title="Districts"
        className="border border-top-0 p-3"
        tabClassName="text-dark"
      >
        <DistrictConfig />
      </Tab>
      <Tab
        eventKey="cities"
        title="Cities"
        className="border border-top-0 p-3"
        tabClassName="text-dark"
      >
        <CityConfig />
      </Tab>
    </Tabs>
  );
}
