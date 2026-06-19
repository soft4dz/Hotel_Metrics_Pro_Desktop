import { describe, it, expect } from 'vitest';
import { buildSidebarModules, findActiveModuleId } from './sidebarModules';

describe('buildSidebarModules', () => {
  it('retourne au moins les sections pilotage, exploitation, administration et systeme', () => {
    const mods = buildSidebarModules('ADMIN_DEC');
    const ids = mods.map((m) => m.id);
    expect(ids).toContain('pilotage');
    expect(ids).toContain('exploitation');
    expect(ids).toContain('administration');
    expect(ids).toContain('systeme');
  });

  it('inclut la section RH pour un rôle RH_MANAGER', () => {
    const mods = buildSidebarModules('RH_MANAGER');
    expect(mods.some((m) => m.id === 'rh')).toBe(true);
  });

  it('masque la section RH quand le rôle n\'a pas de permission RH', () => {
    const mods = buildSidebarModules('COMPTABLE');
    const rh = mods.find((m) => m.id === 'rh');
    expect(!rh || rh.visible === false).toBe(true);
  });

  it('propage le badge pendingUsers dans la section administration', () => {
    const mods = buildSidebarModules('ADMIN_DEC', 3);
    const admin = mods.find((m) => m.id === 'administration')!;
    const usersItem = admin.items.find((i) => i.to === '/admin/users');
    expect(usersItem?.badge).toBe(3);
  });

  it('ne met pas de badge quand pendingUsers=0', () => {
    const mods = buildSidebarModules('ADMIN_DEC', 0);
    const admin = mods.find((m) => m.id === 'administration')!;
    const usersItem = admin.items.find((i) => i.to === '/admin/users');
    expect(usersItem?.badge).toBeUndefined();
  });

  it('les sections RH et PortMaster ont un moduleId défini', () => {
    const mods = buildSidebarModules('ADMIN_DEC');
    const rh = mods.find((m) => m.id === 'rh');
    const port = mods.find((m) => m.id === 'portmaster');
    expect(rh?.moduleId).toBe('rh-productivite');
    expect(port?.moduleId).toBe('portmaster');
  });
});

describe('findActiveModuleId', () => {
  const modules = buildSidebarModules('ADMIN_DEC');

  it('retourne null quand aucune route ne correspond', () => {
    expect(findActiveModuleId(modules, '/inexistant')).toBeNull();
  });

  it('trouve le module pour une route exacte', () => {
    expect(findActiveModuleId(modules, '/dashboard')).toBe('pilotage');
  });

  it('trouve le module pour une sous-route', () => {
    expect(findActiveModuleId(modules, '/recettes/journalieres/detail')).toBe('exploitation');
  });

  it('préfère la route la plus longue (plus précise)', () => {
    expect(findActiveModuleId(modules, '/recettes/historique')).toBe('exploitation');
  });

  it('trouve le module administration pour /admin/users', () => {
    expect(findActiveModuleId(modules, '/admin/users')).toBe('administration');
  });
});
