import { Navigate } from 'react-router-dom';

/** Redirection legacy — le référentiel est dans le hub RH. */
export function RhReferentielPage() {
  return <Navigate to="/rh/referentiel" replace />;
}
