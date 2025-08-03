// src/utils/diceRoller.ts

/**
 * Represents the result of a dice roll.
 */
interface DiceRollResult {
  rolls: number[];
  sum: number;
  modifier: number;
  formula: string;
}

export const DiceRoller = {
  /**
   * Rolls dice based on a formula (e.g., "1d20", "2d6+3").
   * Supports basic NdN and optional +M or -M.
   * @param formula The dice rolling formula string.
   * @returns A DiceRollResult object.
   */
  roll: (formula: string): DiceRollResult => {
    const parts = formula.match(/^(\d*)d(\d+)([\+\-]\d+)?$/i);
    if (!parts) {
      throw new Error(`Invalid dice formula: ${formula}. Expected format: NdN[+M|-M]`);
    }

    const numDice = parseInt(parts[1] || '1', 10);
    const numSides = parseInt(parts[2], 10);
    const modifier = parts[3] ? parseInt(parts[3], 10) : 0;

    const rolls: number[] = [];
    let sum = 0;

    for (let i = 0; i < numDice; i++) {
      const roll = Math.floor(Math.random() * numSides) + 1;
      rolls.push(roll);
      sum += roll;
    }

    return {
      rolls,
      sum: sum + modifier,
      modifier,
      formula,
    };
  },

  /**
   * Formats a DiceRollResult into a human-readable string.
   * @param result The DiceRollResult to format.
   * @returns A formatted string (e.g., "Roll: 2d6 -> [3, 5] = 8").
   */
  format: (result: DiceRollResult): string => {
    let summary = `Roll: ${result.formula} -> [${result.rolls.join(', ')}]`;
    if (result.modifier !== 0) {
      summary += `${result.modifier >= 0 ? '+' : ''}${result.modifier}`;
    }
    summary += ` = ${result.sum}`;
    return summary;
  },
};