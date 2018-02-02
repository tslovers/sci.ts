/**
 * @author Hector J. Vasquez <ipi.vasquez@gmail.com>
 *
 * @licence
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as sci from '../..';
import * as std from 'std.ts';
import {BitSet} from 'std.ts';
import * as _debug from 'debug';

const debug = _debug('SPP');

/**
 * Prepares a Set Partitioning Problem to its solving through David Levine's
 * algorithm by preparing strategies to solve quickly some constrains.
 */
export class SPProblem {
  private averageNonZeros: number;
  private Ri: number[][];
  private penalty: number;

  /**
   * Creates a binary string representing the given solution.
   * @param s The solution requested to be displayed.
   * @returns The binary string of the given solution.
   */
  static stringSol(s: BitSet): string {
    let str = '';

    for (let i = 0; i < s.size; i++) {
      str += `${s.get(i) ? '1' : '0'}`;
    }

    return str;
  }

  /**
   * Checks if two solutions are equal.
   * @param a
   * @param b
   * @returns true if a equals b, false otherwise.
   */
  static equalSolution (a: BitSet, b: BitSet): boolean {
    for (let i = 0; i < a.size; i++) {
      if (a.get(i) !== b.get(i)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Build an instance of SPP.
   * @param rows The number of rows for this problem.
   * @param costs A vector specifying how much does the i-th set cost.
   * @param sets The sets.
   * @param penaltyFactor An indicator when some column is violating the
   * feasible space of string solutions will be applied.
   */
  constructor(private rows: number,
              private sets: number[][],
              private costs: number[],
              penaltyFactor = 1) {
    debug('Validating input');
    if (sets.length !== costs.length) {
      const details = `Lengths:\n${sets.length} sets and ${costs.length} costs`;
      throw new Error(details);
    }
    const avgCost = sci.statistics.avg(this.costs);
    this.penalty = avgCost * penaltyFactor;
    // Init sets
    this.init();
  }

  /**
   * Initializes sets to be able to find in which sets some elements are.
   * Sorts sets according to where cost/size relation.
   */
  init() {
    debug('Sorting and preparing sets');
    this.averageNonZeros = 0;
    this.Ri = [];
    for (let i = 0; i < this.rows; i++) {
      this.Ri.push([]);
    }
    for (let i = 0; i < this.n; i++) {
      // Sort for easy finding later
      std.algorithm.sort(this.sets[i], 0, this.sets[i].length);
      this.averageNonZeros += this.sets[i].length;
      // Initialization of R (fixed), as the transpose of this.sets
      this.sets[i].forEach(row => this.Ri[row].push(i));
    }
    // Calculate average number of non-zeros to generate solutions
    this.averageNonZeros /= this.n;
  }

  /**
   * Calculates the heuristic value for s, if the solution isn't feasible
   * then it adds a penalty for each infeasibility.
   * @param s The solution to calculate.
   * @returns The heuristic value of s.
   */
  value(s: BitSet) {
    let value = 0;
    let penalties = 0;

    // Initialization of ri
    for (const row of this.Ri) {
      let r = -1;
      for (let i = 0; i < row.length; i++) {
        if (s.get(row[i])) {
          r++;
        }
      }
      penalties += Math.abs(r) * this.penalty;
    }

    for (let i = 0; i < s.size; i++) {
      if (s.get(i)) {
        value += this.costs[i];
      }
    }

    return value + penalties;
  }

  /**
   * Generates a solution for this problem, infeasible solutions are valid
   * for this output. This method generates a solution with a modified
   * random initialization proposed by Levine. This modification consists
   * basically on guessing according to the expected structure of an SPP
   * solution. According to Levine's paper, the number of non-zero values on
   * the solution may approximate to m / averageNonZero, where m is the
   * number of rows and averageNonZero represents the average number of rows
   * contained in each set/column.
   * @returns A solution for this.
   */
  generate() {
    const s = new BitSet(this.n);
    const nonZero = this.rows / this.averageNonZeros;

    for (let i = 0; i < nonZero; i++) {
      const v = sci.discrete.randInt(0, this.n);
      if (s.get(v)) {
        i--;
      } else {
        s.set(v, true);
      }
    }

    return s;
  }

  /**
   * Optimizes each individual in the solution with a local search heuristic
   * (ROW).
   * The ROW heuristic is a row-oriented view of the problem. Where:
   * Ri = {j € J | aij = 1} (fixed) is the set of columns that intersect i.
   * ri = {j € Ri | xj = 1} (changing) is the set of columns that intersect
   * row i in the current solution.
   * @param s The solution to improve.
   * @param is The strategy to be used when improving s.
   * @param rss The strategy to be used for knowing which column to improve.
   * @returns An improved solution from based on s.
   */
  improve(s: BitSet,
          is: ImprovementStrategy,
          rss: RowSelectionStrategy): BitSet {
    // Creating new solution
    let newS = new BitSet(s.size, s.buffer);
    const cols = this.selectRow(s, rss);
    let bestCost = this.value(s);
    let best = -1;

    if (is === ImprovementStrategy.Best) {
      for (let i = 0; i < cols.length; i++) {
        newS.set(cols[i], !newS.get(cols[i]));
        const colCost = this.value(newS);
        if (colCost < bestCost) {
          // Save improvement
          bestCost = colCost;
          best = i;
        }
        // Leave it as it was
        newS.set(cols[i], !newS.get(cols[i]));
      }
      if (best !== -1) {
        // The best improvement found
        newS.set(cols[best], !newS.get(cols[best]));
        return newS;
      }
    } else {
      for (const col of cols) {
        newS.set(col, !newS.get(col));
        const colValue = this.value(newS);
        if (colValue < bestCost) {
          // Return the first best improvement
          return newS;
        } else {
          // Leave it as it was
          newS.set(col, !newS.get(col));
        }
      }
    }

    return s;
  }

  /**
   * Crossovers a and b. David Levine proposed that after a crossover, two
   * point crossover, each bit of the resulting children will have a (1 / n)
   * probability of mutation.
   * @param a Solution a.
   * @param b Solution b.
   * @returns Children with a & b features.
   */
  crossover(a, b) {
    // Copy a & b
    const ab = new BitSet(a.size);
    const ba = new BitSet(b.size);
    // Probability of mutation
    const pMutation = 1 / this.n;

    const x = sci.discrete.randInt(0, a.size);
    let distance;
    // Avoid 0
    while ((distance = sci.discrete.randInt(0, a.size - 1)) === 0) {}

    for (let i = 0; i < a.size; i++) {
      if (inRange.bind(this)(i, x, distance)) {
        // In crossover range
        ab.set(i, Math.random() < pMutation ? !b.get(i) : b.get(i));
        ba.set(i, Math.random() < pMutation ? !a.get(i) : a.get(i));
      } else {
        // Not in crossover range
        ab.set(i, Math.random() < pMutation ? !a.get(i) : a.get(i));
        ba.set(i, Math.random() < pMutation ? !b.get(i) : b.get(i));
      }
    }

    return [ab, ba];

    /**
     * Checks if i is in mutation range.
     * @param i The index to check whether is in range or doesn't
     * @param center Starting point of the range.
     * @param range The size of the range.
     * @returns true if i is in range, false otherwise.
     */
    function inRange(i, center, range) {
      return (i > x && i < (center + range)) ||
        (x + range >= this.n && i <= (center + distance) % this.n);
    }
  }

  /**
   * Checks whether s is feasible for this or doesn't.
   * @param s The solution to check feasibility.
   * @returns true if s is feasible, false otherwise.
   */
  validate(s: BitSet) {
    const bs = new BitSet(this.rows);

    for (let i = 0; i < this.n; i++) {
      if (s.get(i)) {
        for (const row of this.sets[i]) {
          if (bs.get(row)) {
            return false;
          } else {
            bs.set(row, true);
          }
        }
      }
    }

    return bs.all();
  }

  /**
   * Returns the problem's size.
   * @returns The size of the problem.
   */
  get n(): number {
    return this.sets.length;
  }

  /**
   * Helps to select a row according to the strategy specified.
   * @param s The solution from which row will be selected.
   * @param rss The strategy to used for returning a row.
   * @returns The columns that this row set contains.
   */
  private selectRow(s: BitSet, rss: RowSelectionStrategy): number[] {
    if (rss === RowSelectionStrategy.Max) {
      let max = [];
      // Initialization of ri
      for (const row of this.Ri) {
        const r: number[] = [];
        for (let i = 0; i < row.length; i++) {
          if (s.get(row[i])) {
            r.push(row[i]);
          }
        }
        if (r.length > max.length) {
          max = r;
        }
      }

      return max;
    } else {
      // Randomly choose a row
      const row = this.Ri[sci.discrete.randInt(0, this.rows)];
      const r: number[] = [];

      for (let i = 0; i < row.length; i++) {
        if (s.get(row[i])) {
          r.push(row[i]);
        }
      }

      return r;
    }
  }
}

/**
 * The strategy used to select a row is:
 * Random or Max (The greatest infeasibility is chosen).
 */
export enum RowSelectionStrategy {
  Random,
  Max
}

/**
 * The strategy to improve the solution may be:
 * First choosing the first improvement that occurs or
 * Best choosing the best of all improvements occurred.
 */
export enum ImprovementStrategy {
  First,
  Best
}
