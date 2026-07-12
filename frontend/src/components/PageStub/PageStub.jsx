import Card from '../Card/Card';
import './PageStub.css';

// Generic placeholder for a screen that hasn't been fully built yet.
// Once a page owner builds the real screen, delete this import and
// replace the page body — routing/layout stay untouched.
export default function PageStub({ screenNumber, title, owner, bullets = [] }) {
  return (
    <Card className="page-stub">
      <span className="page-stub__eyebrow">
        Screen {screenNumber} · Owner: {owner}
      </span>
      <h2>{title}</h2>
      <ul className="page-stub__list">
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </Card>
  );
}