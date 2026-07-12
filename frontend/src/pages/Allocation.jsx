import PageStub from '../components/PageStub/PageStub';

// Screen 5 — Allocation & Transfer
// Owner: Yash
export default function Allocation() {
  return (
    <PageStub
      screenNumber={5}
      owner="Yash"
      title="Allocation & Transfer"
      bullets={[
        'Asset detail view with current allocation status',
        'Red conflict banner on 409: "Already allocated to ..."',
        'Transfer Request flow: from/to employee selectors + reason',
        'Allocation history table',
      ]}
    />
  );
}