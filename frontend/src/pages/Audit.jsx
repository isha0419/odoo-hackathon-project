import PageStub from '../components/PageStub/PageStub';

// Screen 8 — Asset Audit
// Owner: Isha
export default function Audit() {
  return (
    <PageStub
      screenNumber={8}
      owner="Isha"
      title="Asset Audit"
      bullets={[
        'Cycle header: name + date range',
        'Checklist table: Asset, Expected Location, Verification badge (Verified / Missing / Damaged)',
        'Discrepancy report banner + Close audit cycle button',
      ]}
    />
  );
}