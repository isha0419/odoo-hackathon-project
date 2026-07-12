import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { assetsApi } from '../api/assets';
import { allocationsApi, isAllocationConflict } from '../api/allocations';
import { transfersApi } from '../api/transfers';
import { orgApi } from '../api/org';
import { ApiError } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { isDeptHeadPlus } from '../utils/roles';
import { AssetStatus, AllocationStatus, TransferStatus } from '../utils/constants';
import StatusBadge from '../components/StatusBadge';
import Spinner from '../components/Spinner';
import Banner from '../components/Banner';
import EmptyState from '../components/EmptyState';
import { formatDate } from '../utils/format';
import './AllocationTransfer.css';

export default function AllocationTransfer() {
  const { assetId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canAllocate = isDeptHeadPlus(user);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [employees, setEmployees] = useState([]);
  const [employeeMap, setEmployeeMap] = useState({});

  const [conflict, setConflict] = useState(null);
  const [allocateHolder, setAllocateHolder] = useState('');
  const [allocateReturnDate, setAllocateReturnDate] = useState('');
  const [allocating, setAllocating] = useState(false);

  const [transferTo, setTransferTo] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferMsg, setTransferMsg] = useState('');

  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [returnNotes, setReturnNotes] = useState('');
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    if (!canAllocate) return;
    orgApi
      .listEmployees({ limit: 200 })
      .then((emps) => {
        setEmployees(emps);
        setEmployeeMap(Object.fromEntries(emps.map((e) => [e.id, e])));
      })
      .catch(() => {});
  }, [canAllocate]);

  const loadAsset = useCallback(() => {
    if (!assetId) return;
    setLoading(true);
    setError('');
    setConflict(null);
    setTransferMsg('');
    assetsApi
      .get(assetId)
      .then(setAsset)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load asset.'))
      .finally(() => setLoading(false));
  }, [assetId]);

  useEffect(loadAsset, [loadAsset]);

  useEffect(() => {
    if (!assetId || !canAllocate) {
      setPendingTransfers([]);
      return;
    }
    transfersApi
      .list({ status: TransferStatus.REQUESTED, limit: 100 })
      .then((all) => setPendingTransfers(all.filter((t) => t.asset_id === assetId)))
      .catch(() => setPendingTransfers([]));
  }, [assetId, canAllocate, asset]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      assetsApi
        .list({ q: query, limit: 10 })
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  const activeAllocation = asset?.allocations?.find((a) => a.status === AllocationStatus.ACTIVE);
  const activeHolderName = activeAllocation
    ? employeeMap[activeAllocation.holder_user_id]?.name || (activeAllocation.holder_department_id ? 'Department holder' : 'another employee')
    : null;

  async function handleAllocate(e) {
    e.preventDefault();
    setAllocating(true);
    setConflict(null);
    setError('');
    try {
      await allocationsApi.allocate({
        asset_id: asset.id,
        holder_user_id: allocateHolder || null,
        expected_return_date: allocateReturnDate || null,
      });
      setAllocateHolder('');
      setAllocateReturnDate('');
      loadAsset();
    } catch (err) {
      if (isAllocationConflict(err)) {
        setConflict(err.body);
        setTransferTo(allocateHolder);
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not allocate asset.');
      }
    } finally {
      setAllocating(false);
    }
  }

  async function handleTransferRequest(e) {
    e.preventDefault();
    setTransferring(true);
    setTransferMsg('');
    setError('');
    try {
      await transfersApi.create({ asset_id: asset.id, to_user_id: transferTo, reason: transferReason || null });
      setTransferMsg('Transfer request submitted — awaiting approval.');
      setTransferTo('');
      setTransferReason('');
      loadAsset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit transfer request.');
    } finally {
      setTransferring(false);
    }
  }

  async function handleApprove(transferId) {
    setError('');
    try {
      await transfersApi.approve(transferId);
      loadAsset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not approve transfer.');
    }
  }

  async function handleReject(transferId) {
    setError('');
    try {
      await transfersApi.reject(transferId);
      loadAsset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reject transfer.');
    }
  }

  async function handleReturn(e) {
    e.preventDefault();
    if (!activeAllocation) return;
    setReturning(true);
    setError('');
    try {
      await allocationsApi.returnAsset(activeAllocation.id, returnNotes || null);
      setReturnNotes('');
      loadAsset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not process return.');
    } finally {
      setReturning(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Allocation &amp; Transfer</h1>
          <p className="page-subtitle">Find an asset to allocate, transfer, or return.</p>
        </div>
      </div>

      <div className="field alloc-search">
        <label>Asset</label>
        <input
          className="input"
          placeholder="Search by tag, serial, or name… e.g. AF-0114"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query.trim() && (
          <div className="alloc-search-results">
            {searching && <div className="alloc-search-empty">Searching…</div>}
            {!searching && results.length === 0 && <div className="alloc-search-empty">No matching assets</div>}
            {results.map((a) => (
              <button
                key={a.id}
                className="alloc-search-item"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  navigate(`/assets/${a.id}`);
                }}
              >
                <span className="tag-mono">{a.asset_tag}</span> — {a.name}
                <StatusBadge status={a.status} />
              </button>
            ))}
          </div>
        )}
      </div>

      {!assetId && <EmptyState title="Search for an asset above" hint="Pick an asset to view its allocation status and history." />}

      {loading && <Spinner label="Loading asset…" />}
      {error && <Banner tone="danger">{error}</Banner>}

      {asset && !loading && (
        <>
          <div className="card alloc-header-card">
            <div>
              <div className="alloc-asset-title">
                <span className="tag-mono">{asset.asset_tag}</span> — {asset.name}
              </div>
              <div className="page-subtitle">{asset.location || 'No location set'}</div>
            </div>
            <StatusBadge status={asset.status} />
          </div>

          {activeAllocation && (
            <Banner tone="danger" title={`Already allocated to ${activeHolderName} ${activeAllocation.expected_return_date ? `· due ${formatDate(activeAllocation.expected_return_date)}` : ''}`}>
              Direct re-allocation is blocked — submit a transfer request below, or return the asset first.
            </Banner>
          )}

          {conflict && (
            <Banner tone="danger" title="Allocation blocked">
              {conflict.message} A transfer request has been pre-filled below.
            </Banner>
          )}

          {pendingTransfers.length > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <h2 className="section-title">Pending Transfer Request{pendingTransfers.length > 1 ? 's' : ''}</h2>
              {pendingTransfers.map((t) => (
                <div key={t.id} className="pending-transfer-row">
                  <div>
                    <strong>{t.from_user.name}</strong> → <strong>{t.to_user.name}</strong>
                    {t.reason && <div className="page-subtitle">“{t.reason}”</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm btn-primary" onClick={() => handleApprove(t.id)}>
                      Approve
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleReject(t.id)}>
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="alloc-grid">
            {canAllocate && !activeAllocation && (
              <div className="card">
                <h2 className="section-title">Allocate</h2>
                <form onSubmit={handleAllocate}>
                  <div className="field">
                    <label>Assign to employee</label>
                    <select className="input" value={allocateHolder} onChange={(e) => setAllocateHolder(e.target.value)} required>
                      <option value="">Select employee…</option>
                      {employees.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name} {e.department_name ? `(${e.department_name})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Expected return date (optional)</label>
                    <input
                      className="input"
                      type="date"
                      value={allocateReturnDate}
                      onChange={(e) => setAllocateReturnDate(e.target.value)}
                    />
                  </div>
                  <button className="btn btn-primary" type="submit" disabled={allocating}>
                    {allocating ? 'Allocating…' : 'Allocate Asset'}
                  </button>
                </form>
              </div>
            )}

            {canAllocate && activeAllocation && (
              <div className="card">
                <h2 className="section-title">Return Asset</h2>
                <form onSubmit={handleReturn}>
                  <div className="field">
                    <label>Condition notes (optional)</label>
                    <textarea
                      className="input"
                      placeholder="e.g. good condition, minor scuff on lid"
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                    />
                  </div>
                  <button className="btn btn-primary" type="submit" disabled={returning}>
                    {returning ? 'Processing…' : 'Mark Returned'}
                  </button>
                </form>
              </div>
            )}

            <div className="card">
              <h2 className="section-title">Transfer Request</h2>
              <form onSubmit={handleTransferRequest}>
                {transferMsg && (
                  <div className="banner banner-success" style={{ marginBottom: 14 }}>
                    {transferMsg}
                  </div>
                )}
                <div className="form-row">
                  <div className="field">
                    <label>From</label>
                    <input className="input" disabled value={activeHolderName || 'Unallocated'} />
                  </div>
                  <div className="field">
                    <label>To</label>
                    {employees.length > 0 ? (
                      <select className="input" value={transferTo} onChange={(e) => setTransferTo(e.target.value)} required>
                        <option value="">Select employee…</option>
                        {employees.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="input"
                        placeholder="Employee user ID"
                        value={transferTo}
                        onChange={(e) => setTransferTo(e.target.value)}
                        required
                      />
                    )}
                  </div>
                </div>
                <div className="field">
                  <label>Reason</label>
                  <textarea
                    className="input"
                    placeholder="Why is this asset being transferred?"
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                  />
                </div>
                <button className="btn btn-primary" type="submit" disabled={transferring || !activeAllocation}>
                  {transferring ? 'Submitting…' : 'Submit Request'}
                </button>
                {!activeAllocation && <p className="form-hint" style={{ marginTop: 8 }}>Asset must be allocated before it can be transferred.</p>}
              </form>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <h2 className="section-title">Allocation History</h2>
            {asset.allocations?.length ? (
              <ul className="history-list">
                {[...asset.allocations]
                  .sort((a, b) => new Date(b.allocated_at) - new Date(a.allocated_at))
                  .map((a) => (
                    <li key={a.id}>
                      <div>
                        <strong>{formatDate(a.allocated_at)}</strong> — allocated to{' '}
                        {employeeMap[a.holder_user_id]?.name || (a.holder_user_id ? 'employee' : 'department')}
                        {a.status === AllocationStatus.RETURNED && a.returned_at && (
                          <> · returned {formatDate(a.returned_at)}{a.return_condition_notes ? ` — condition: ${a.return_condition_notes}` : ''}</>
                        )}
                      </div>
                      <StatusBadge status={a.status} />
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="page-subtitle">No allocation history yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
