import Card from '../components/Card/Card';
import Button from '../components/Button/Button';
import { BarChart } from '../components/Charts/Charts';
import { mockReports } from '../data/reports';
import './Reports.css';

// Screen 9 — Reports & Analytics
// Owner: Isha
// TODO(Isha): replace mockReports with api.get('/reports/summary'), and wire
// "Export CSV" to GET /reports/export?report=....
export default function Reports() {
  const { utilizationByDept, maintenanceFrequency, mostUsedAssets, idleAssets } = mockReports;

  return (
    <div className="reports">
      <div className="reports__charts">
        <Card>
          <h3>Utilization by Department</h3>
          <BarChart data={utilizationByDept} />
        </Card>
        <Card>
          <h3>Maintenance Frequency</h3>
          <BarChart data={maintenanceFrequency} />
        </Card>
      </div>

      <div className="reports__lists">
        <Card>
          <h3>Most Used Assets</h3>
          <ul>
            {mostUsedAssets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
        <Card>
          <h3>Idle Assets</h3>
          <ul>
            {idleAssets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      </div>

      <Button variant="secondary">Export CSV</Button>
    </div>
  );
}