import PageStub from '../components/PageStub/PageStub';

// Screen 4 — Asset Registry
// Owner: Yash
export default function Assets() {
  return (
    <PageStub
      screenNumber={4}
      owner="Yash"
      title="Asset Registry"
      bullets={[
        'Search bar: tag, serial, or QR code + Register Asset button',
        'Filter pills: Category, Status, Department',
        'Assets table: Tag, Name, Category, Status badge, Location',
        'Demo anchor asset AF-0114 must be visible here',
      ]}
    />
  );
}