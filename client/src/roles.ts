import { getCard } from '../../shared/cards';

/** Para que serve uma carta; calculado a partir das mecânicas, por isso cartas novas entram sozinhas nos filtros. */
export type Role = 'dano' | 'cura' | 'imunidade' | 'energia' | 'controlo' | 'permanente';

export const ROLES: [Role, string][] = [
  ['dano', '⚔️ Dano'],
  ['cura', '❤️ Cura'],
  ['imunidade', '🛡️ Imunidade'],
  ['energia', '⚡ Energia'],
  ['controlo', '🎛️ Controlo'],
  ['permanente', '♾️ Permanente'],
];

export function cardRoles(id: string): Set<Role> {
  const card = getCard(id);
  const roles = new Set<Role>();
  if (card.permanent) roles.add('permanente');
  for (const e of card.effects) {
    switch (e.mechanic) {
      case 'damage':
      case 'damagePerDisease':
      case 'damageOverTime':
      case 'infection':
        roles.add('dano');
        break;
      case 'heal':
      case 'healOverTime':
      case 'cleanse':
        roles.add('cura');
        break;
      case 'immunity':
        roles.add('imunidade');
        break;
      case 'drainEnergy':
      case 'drainEnergyOverTime':
      case 'drainEnergyAbove':
      case 'gainEnergyOverTime':
        roles.add('energia');
        break;
      case 'statModifier':
        // Energia máxima/regeneração conta como energia; vida máxima e multiplicadores de dano contam como dano.
        roles.add(e.params.stat === 'energyRegen' || e.params.stat === 'maxEnergy' ? 'energia' : 'dano');
        break;
      case 'forbidTypes':
        roles.add('imunidade');
        roles.add('controlo');
        break;
      default:
        // Custos, bloqueios, mão, Paranoia...
        roles.add('controlo');
    }
  }
  return roles;
}
