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
      case 'finisher':
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
      case 'energyBurst':
        roles.add('energia');
        break;
      case 'statModifier': {
        const { stat } = e.params;
        if (stat === 'energyRegen' || stat === 'maxEnergy') roles.add('energia');
        else if (stat === 'healingTaken') roles.add('controlo'); // Lepra
        else if (stat.endsWith('DamageTaken')) roles.add(card.target === 'self' ? 'imunidade' : 'dano'); // proteção / SIDA, Febre
        else roles.add('dano');
        break;
      }
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
