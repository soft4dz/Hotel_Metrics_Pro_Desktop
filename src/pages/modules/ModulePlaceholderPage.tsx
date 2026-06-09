import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Blocks, CheckCircle2, Construction, ExternalLink, Network } from 'lucide-react';
import { getModuleById, MODULE_STATUS_LABELS, MODULES } from '@/modules/moduleCatalog';

const statusStyles = {
  operationnel: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  socle: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  'a-developper': 'border-amber-500/30 bg-amber-500/10 text-amber-