import { useMemo, useState } from 'react';
import { mockAssets, mockEmployees, mockAllocationHistory } from '../data/allocations';
import './Allocation.css';

// Screen 5 — Allocation & Transfer
// Owner: Yash
//
// NOTE: This page is self-contained (plain HTML + Allocation.css) rather than
// wired to the shared Card/Table/SearchBar components, since their prop APIs
// weren't available. Swap in the shared components later if desired — the
// state/logic below is decoupled from markup and can be reused as-is.

function formatDateLabel(dateInput) {
  const date = new Date(dateInput);
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}

export default function Allocation() {
  const [assets, setAssets] = useState(() => mockAssets.map((asset) => ({ ...asset })));
  const [historyByAsset, setHistoryByAsset] = useState(() => ({ ...mockAllocationHistory }));

  const [selectedAssetId, setSelectedAssetId] = useState(mockAssets[0]?.id ?? '');
  const [assetQuery, setAssetQuery] = useState(() => {
    const first = mockAssets[0];
    return first ? `${first.id} - ${first.name}` : '';
  });
  const [isAssetListOpen, setIsAssetListOpen] = useState(false);

  const [toEmployeeId, setToEmployeeId] = useState('');
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState(null); // { type: 'success' | 'error', message }

  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? null;
  const history = historyByAsset[selectedAssetId] ?? [];

  const filteredAssets = useMemo(() => {
    const query = assetQuery.trim().toLowerCase();
    if (!query) return assets;
    return assets.filter(
      (asset) =>
        asset.id.toLowerCase().includes(query) || asset.name.toLowerCase().includes(query)
    );
  }, [assetQuery, assets]);

  const eligibleEmployees = mockEmployees.filter(
    (employee) => employee.id !== selectedAsset?.allocatedTo?.id
  );

  function handleSelectAsset(asset) {
    setSelectedAssetId(asset.id);
    setAssetQuery(`${asset.id} - ${asset.name}`);
    setIsAssetListOpen(false);
    setToEmployeeId('');
    setReason('');
    setNotice(null);
  }

  function handleAssetInputChange(event) {
    setAssetQuery(event.target.value);
    setIsAssetListOpen(true);
    setNotice(null);
  }

  function handleSubmitTransfer(event) {
    event.preventDefault();
    if (!toEmployeeId || !reason.trim() || !selectedAsset) return;

    const toEmployee = mockEmployees.find((employee) => employee.id === toEmployeeId);
    const entry = {
      date: new Date().toISOString(),
      type: 'transfer_requested',
      text: `Transfer requested to ${toEmployee.name} - ${toEmployee.department} (pending approval). Reason: ${reason.trim()}`,
    };

    setHistoryByAsset((prev) => ({
      ...prev,
      [selectedAssetId]: [entry, ...(prev[selectedAssetId] ?? [])],
    }));
    setNotice({
      type: 'success',
      message: `Transfer request submitted for ${toEmployee.name}. Awaiting admin approval.`,
    });
    setToEmployeeId('');
    setReason('');
  }

  function handleDirectAllocate(event) {
    event.preventDefault();
    if (!toEmployeeId || !selectedAsset) return;

    const toEmployee = mockEmployees.find((employee) => employee.id === toEmployeeId);

    setAssets((prev) =>
      prev.map((asset) =>
        asset.id === selectedAssetId
          ? {
              ...asset,
              allocatedTo: {
                id: toEmployee.id,
                name: toEmployee.name,
                department: toEmployee.department,
              },
            }
          : asset
      )
    );

    const entry = {
      date: new Date().toISOString(),
      type: 'allocated',
      text: `Allocated to ${toEmployee.name} - ${toEmployee.department}`,
    };
    setHistoryByAsset((prev) => ({
      ...prev,
      [selectedAssetId]: [entry, ...(prev[selectedAssetId] ?? [])],
    }));

    setNotice({
      type: 'success',
      message: `${selectedAsset.name} allocated to ${toEmployee.name}.`,
    });
    setToEmployeeId('');
    setReason('');
  }

  return (
    <div className="allocation-page">
      <header className="allocation-header">
        <h1 className="allocation-title">Allocation &amp; Transfer</h1>
        <p className="allocation-subtitle">
          Look up an asset to view its current allocation and request a transfer.
        </p>
      </header>

      <section className="allocation-card" aria-labelledby="asset-lookup-heading">
        <h2 id="asset-lookup-heading" className="allocation-section-label">
          Asset
        </h2>

        <div className="allocation-combobox">
          <label htmlFor="asset-search" className="sr-only">
            Search asset by ID or name
          </label>
          <input
            id="asset-search"
            type="text"
            role="combobox"
            aria-expanded={isAssetListOpen}
            aria-controls="asset-search-results"
            autoComplete="off"
            className="allocation-input"
            placeholder="Search by asset ID or name…"
            value={assetQuery}
            onChange={handleAssetInputChange}
            onFocus={() => setIsAssetListOpen(true)}
            onBlur={() => setTimeout(() => setIsAssetListOpen(false), 120)}
          />

          {isAssetListOpen && (
            <ul id="asset-search-results" className="allocation-dropdown" role="listbox">
              {filteredAssets.length === 0 && (
                <li className="allocation-dropdown-empty">No matching assets</li>
              )}
              {filteredAssets.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    className="allocation-option"
                    role="option"
                    aria-selected={asset.id === selectedAssetId}
                    onMouseDown={() => handleSelectAsset(asset)}
                  >
                    <span>
                      {asset.id} - {asset.name}
                    </span>
                    <span
                      className={
                        asset.allocatedTo
                          ? 'allocation-badge allocation-badge--allocated'
                          : 'allocation-badge allocation-badge--available'
                      }
                    >
                      {asset.allocatedTo ? 'Allocated' : 'Available'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selectedAsset && selectedAsset.allocatedTo && (
          <div className="allocation-banner allocation-banner--danger" role="alert">
            <p className="allocation-banner-title">
              Already Allocated to {selectedAsset.allocatedTo.name} ({selectedAsset.allocatedTo.department})
            </p>
            <p className="allocation-banner-text">
              Direct re-allocation is blocked - submit a transfer request below
            </p>
          </div>
        )}

        {selectedAsset && !selectedAsset.allocatedTo && (
          <div className="allocation-banner allocation-banner--success" role="status">
            <p className="allocation-banner-title">Available for allocation</p>
            <p className="allocation-banner-text">
              This asset has no active holder. Allocate it directly below.
            </p>
          </div>
        )}
      </section>

      {selectedAsset && notice && (
        <div
          className={`allocation-notice allocation-notice--${notice.type}`}
          role="status"
          aria-live="polite"
        >
          {notice.message}
        </div>
      )}

      {selectedAsset && selectedAsset.allocatedTo && (
        <section className="allocation-card" aria-labelledby="transfer-request-heading">
          <h2 id="transfer-request-heading" className="allocation-section-label">
            Transfer Request
          </h2>

          <form onSubmit={handleSubmitTransfer} className="allocation-form">
            <div className="allocation-form-row">
              <div className="allocation-field">
                <label htmlFor="transfer-from" className="allocation-label">
                  From
                </label>
                <input
                  id="transfer-from"
                  type="text"
                  className="allocation-input"
                  value={selectedAsset.allocatedTo.name}
                  readOnly
                />
              </div>

              <div className="allocation-field">
                <label htmlFor="transfer-to" className="allocation-label">
                  To
                </label>
                <select
                  id="transfer-to"
                  className="allocation-input"
                  value={toEmployeeId}
                  onChange={(event) => setToEmployeeId(event.target.value)}
                  required
                >
                  <option value="">Select Employee….</option>
                  {eligibleEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} - {employee.department}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="allocation-field">
              <label htmlFor="transfer-reason" className="allocation-label">
                Reason
              </label>
              <textarea
                id="transfer-reason"
                className="allocation-textarea"
                placeholder="Explain why this asset needs to be transferred…"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={5}
                required
              />
            </div>

            <button
              type="submit"
              className="allocation-button allocation-button--primary"
              disabled={!toEmployeeId || !reason.trim()}
            >
              Submit Request
            </button>
          </form>
        </section>
      )}

      {selectedAsset && !selectedAsset.allocatedTo && (
        <section className="allocation-card" aria-labelledby="direct-allocate-heading">
          <h2 id="direct-allocate-heading" className="allocation-section-label">
            Allocate Asset
          </h2>

          <form onSubmit={handleDirectAllocate} className="allocation-form">
            <div className="allocation-field">
              <label htmlFor="allocate-to" className="allocation-label">
                Allocate to
              </label>
              <select
                id="allocate-to"
                className="allocation-input"
                value={toEmployeeId}
                onChange={(event) => setToEmployeeId(event.target.value)}
                required
              >
                <option value="">Select Employee….</option>
                {mockEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} - {employee.department}
                  </option>
                ))}
              </select>
            </div>

            <div className="allocation-field">
              <label htmlFor="allocate-notes" className="allocation-label">
                Notes (optional)
              </label>
              <textarea
                id="allocate-notes"
                className="allocation-textarea"
                placeholder="Any handover notes…"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={4}
              />
            </div>

            <button
              type="submit"
              className="allocation-button allocation-button--primary"
              disabled={!toEmployeeId}
            >
              Allocate Asset
            </button>
          </form>
        </section>
      )}

      <section className="allocation-card" aria-labelledby="allocation-history-heading">
        <h2 id="allocation-history-heading" className="allocation-section-label">
          Allocation history
        </h2>

        {history.length === 0 ? (
          <p className="allocation-history-empty">No allocation history for this asset yet.</p>
        ) : (
          <ul className="allocation-history">
            {history.map((entry, index) => (
              <li key={`${entry.date}-${index}`} className="allocation-history-item">
                <span className="allocation-history-date">{formatDateLabel(entry.date)}</span>
                <span className="allocation-history-text">{entry.text}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
