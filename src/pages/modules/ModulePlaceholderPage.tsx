import { Link, useParams } from 'react-router-dom';
import { getModuleById, MODULE_STATUS_LABELS, MODULES } from '@/modules/moduleCatalog';

export function ModulePlaceholderPage() {
  const { moduleId } = useParams();
  const module = getModuleById(moduleId);

  if (!module) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Module introuvable</h1>
        <p