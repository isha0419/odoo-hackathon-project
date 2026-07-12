import PageStub from '../components/PageStub/PageStub';

// Screen 3 — Organization Setup (Admin)
// Owner: Yash
export default function Organization() {
  return (
    <PageStub
      screenNumber={3}
      owner="Yash"
      title="Organization Setup"
      bullets={[
        'Tab navigation: Departments, Categories, Employees, + Add',
        'Departments table: name, head, parent dept, status badge',
        'Categories table with custom_fields',
        'Employee list with role-promotion action',
      ]}
    />
  );
}