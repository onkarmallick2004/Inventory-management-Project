// Active technicians, for the "assign technician" dropdowns.
import useApi from './useApi';

export default function useTechnicians(enabled = true) {
  return useApi(enabled ? '/users?role=TECHNICIAN&limit=100' : null);
}
