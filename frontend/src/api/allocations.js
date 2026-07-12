import { api, ApiError } from './client';

export const allocationsApi = {
  list: (params) => api.get('/allocations', params),
  allocate: (data) => api.post('/allocations', data),
  returnAsset: (id, returnConditionNotes) =>
    api.post(`/allocations/${id}/return`, { return_condition_notes: returnConditionNotes }),
};

/** True when the error is the crown-jewel #1 double-allocation 409 conflict. */
export function isAllocationConflict(err) {
  return err instanceof ApiError && err.status === 409 && err.body?.error === 'asset_already_allocated';
}
