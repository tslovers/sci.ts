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
 *
 */

import * as _debug from 'debug';
import * as sci from '../..';
import {
  ImprovementStrategy, RowSelectionStrategy,
  SPProblem
} from './SPProblem';
import {BitSet} from 'std.ts';

const debug = _debug('H-SSGA');

/**
 * A genetic algorithm proposed by David Levine. David Levine proposed a Hybrid
 * Steady State Genetic Algorithm (H-SSGA) to perform a global search and then
 * optimize the solutions found with a local search algorithm.
 * @param problem The problem.
 * @param popSize The size of the population.
 * @param genN The number of generations required.
 * @param improvements The times each solution gets improved.
 * @param improveS The strategy used to improve solutions.
 * @param rowSelectionS The strategy used to select next row to improve.
 * @param selRate The number of selections (for parents) on each generations.
 * @param xRate The probability of crossover for each parent.
 * @returns The best solution found.
 */
export function ssgarow(problem: SPProblem,
                        popSize = 100,
                        genN = 500,
                        improvements = 1,
                        improveS = ImprovementStrategy.Best,
                        rowSelectionS = RowSelectionStrategy.Max,
                        selRate = 0.5,
                        xRate = 0.7): BitSet {
  debug('Initializing population');
  // Initializing first population
  const population: BitSet[] = [];
  let pCost: number[] = [];
  for (let i = 0; i < popSize; i++) {
    population.push(problem.generate());
    for (let j = 0; j < improvements; j++) {
      population[i] = problem.improve(population[i], improveS, rowSelectionS);
    }
    pCost.push(problem.value(population[i]));
  }
  debug('Generations passing');
  // Generations count
  for (let gen = 0; gen < genN; gen++) {
    const selection = getCandidates();
    const newP: BitSet[] = [];

    for (const s of selection) {
      if (Math.random() < xRate) {
        // Parent to crossover with selected
        let p = selection[sci.discrete.randInt(0, selection.length)];
        problem.crossover(population[s], population[p])
          .forEach(child => newP.push(child));
      }
    }
    // Replace the old individuals if they're worse than the new ones
    newP.forEach(p => {
      for (let i = 0; i < improvements; i++) {
        p = problem.improve(p, improveS, rowSelectionS);
      }
      const pVal = problem.value(p);
      const worstIdx = findWorst();
      if (pCost[worstIdx] > pVal) {
        pCost[worstIdx] = pVal;
        population[worstIdx] = p;
      }
    });
  }

  debug('Improving final solution');
  let p = population[findBest()];
  for (let i = 0; i < improvements; i++) {
    p = problem.improve(p, improveS, rowSelectionS);
  }

  return p;

  /**
   * According to Levine, candidates will be selected on a binaryTournament.
   * The number of candidates required.
   * @param n The number of candidates.
   */
  function getCandidates(n = Math.floor(popSize * selRate)) {
    const candidates: number[] = [];

    // Tournaments
    while (candidates.length < n) {
      const candidate = binaryTournament();
      if (candidates.indexOf(candidate) === -1) {
        candidates.push(candidate);
      }
    }

    return candidates;
  }

  /**
   * Creates a binaryTournament randomly selecting two elements of the
   * population, at the end, the fittest of this two elements wins.
   * @returns The index of the winner of this tournament.
   */
  function binaryTournament(): number {
    const a = sci.discrete.randInt(0, population.length);
    const b = sci.discrete.randInt(0, population.length);
    // Most adapted wins tournament
    if (problem.value(population[a]) < problem.value(population[b])) {
      return a;
    } else {
      return b;
    }
  }

  /**
   * Finds the best solution in the population.
   * @returns The index of the best solution in population.
   */
  function findBest(): number {
    let k = -1;
    let kValue = Infinity;

    for (let i = 0; i < population.length; i++) {
      const iValue = problem.value(population[i]);
      if (kValue > iValue) {
        k = i;
        kValue = iValue;
      }
    }

    return k;
  }

  /**
   * Finds the worst solution in the population.
   * @returns The index of the worst solution in population.
   */
  function findWorst(): number {
    let k = -1;
    let kValue = -Infinity;

    for (let i = 0; i < population.length; i++) {
      const iValue = problem.value(population[i]);
      if (kValue < iValue) {
        k = i;
        kValue = iValue;
      }
    }

    return k;
  }
}