import { useState } from 'react';
import Tabs from '../components/Tabs';
import DepartmentsTab from './org/DepartmentsTab';
import CategoriesTab from './org/CategoriesTab';
import EmployeesTab from './org/EmployeesTab';
import './OrgSetup.css';

const TABS = [
  { key: 'departments', label: 'Departments' },
  { key: 'categories', label: 'Categories' },
  { key: 'employees', label: 'Employees' },
];

export default function OrgSetup() {
  const [tab, setTab] = useState('departments');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Organization Setup</h1>
          <p className="page-subtitle">
            Departments, categories and the employee directory. Editing a department here
            drives the pickers on Assets and Allocation &amp; Transfer.
          </p>
        </div>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'departments' && <DepartmentsTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'employees' && <EmployeesTab />}
    </div>
  );
}
